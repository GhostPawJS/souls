import type { SoulsDb } from './database.ts';
import { shardTraceRefs } from './traces/shard_trace_refs.ts';
import { traceTablesExist } from './traces/trace_tables_exist.ts';
export interface RevisionRecord {
	id: number;
	entity: 'trait' | 'essence';
	entityId: number;
	soulId: number;
	oldText: string | null;
	newText: string;
	reason: string | null;
	operator: string | null;
	createdAt: number;
	shardIds?: number[];
	traceIds?: number[];
}
export function initRevisionTables(db: SoulsDb): void {
	db.exec(
		`CREATE TABLE IF NOT EXISTS soul_revisions (id INTEGER PRIMARY KEY AUTOINCREMENT, entity TEXT NOT NULL CHECK(entity IN ('trait','essence')), entity_id INTEGER NOT NULL, soul_id INTEGER NOT NULL REFERENCES souls(id), old_text TEXT, new_text TEXT NOT NULL, reason TEXT, operator TEXT, created_at INTEGER NOT NULL) STRICT`,
	);
	db.exec(
		`CREATE TABLE IF NOT EXISTS soul_revision_shards (revision_id INTEGER NOT NULL REFERENCES soul_revisions(id), shard_id INTEGER NOT NULL REFERENCES soul_shards(id), PRIMARY KEY(revision_id,shard_id)) STRICT`,
	);
	db.exec('CREATE INDEX IF NOT EXISTS idx_revisions_soul ON soul_revisions(soul_id, id)');
}
export function recordRevision(
	db: SoulsDb,
	entity: 'trait' | 'essence',
	entityId: number,
	soulId: number,
	oldText: string | null,
	newText: string,
	options: {
		shardIds?: number[] | undefined;
		reason?: string | undefined;
		operator?: string | undefined;
		now?: number | undefined;
	} = {},
): number {
	const result = db
		.prepare(
			'INSERT INTO soul_revisions (entity,entity_id,soul_id,old_text,new_text,reason,operator,created_at) VALUES (?,?,?,?,?,?,?,?)',
		)
		.run(
			entity,
			entityId,
			soulId,
			oldText,
			newText,
			options.operator
				? `operator correction${options.reason ? `: ${options.reason}` : ''}`
				: (options.reason ?? null),
			options.operator ?? null,
			options.now ?? Date.now(),
		);
	const id = Number(result.lastInsertRowid);
	if (options.shardIds?.some((shardId) => shardTraceRefs(db, shardId).length))
		for (const shardId of options.shardIds)
			db.prepare(
				'INSERT OR IGNORE INTO soul_revision_shards(revision_id,shard_id) VALUES (?,?)',
			).run(id, shardId);
	return id;
}
export function getRevisionHistory(
	db: SoulsDb,
	options: { soulId?: number; traitId?: number; limit?: number } = {},
): RevisionRecord[] {
	const conditions: string[] = [];
	const params: number[] = [];
	if (options.soulId !== undefined) {
		conditions.push('soul_id = ?');
		params.push(options.soulId);
	}
	if (options.traitId !== undefined) {
		conditions.push("entity = 'trait' AND entity_id = ?");
		params.push(options.traitId);
	}
	return db
		.prepare(
			`SELECT id, entity, entity_id AS entityId, soul_id AS soulId, old_text AS oldText, new_text AS newText, reason, operator, created_at AS createdAt FROM soul_revisions ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY id DESC LIMIT ?`,
		)
		.all<RevisionRecord>(...params, Math.min(1000, Math.max(0, options.limit ?? 100)))
		.map((record) => {
			const shardIds = db
				.prepare('SELECT shard_id FROM soul_revision_shards WHERE revision_id=? ORDER BY shard_id')
				.all<{ shard_id: number }>(record.id)
				.map((r) => r.shard_id);
			const traceIds = traceTablesExist(db)
				? db
						.prepare(
							'SELECT DISTINCT st.trace_id AS id FROM shard_traces st JOIN soul_revision_shards rs ON rs.shard_id=st.shard_id WHERE rs.revision_id=? ORDER BY st.trace_id',
						)
						.all<{ id: number }>(record.id)
						.map((r) => r.id)
				: [];
			if (traceIds.length) return { ...record, shardIds, traceIds };
			return shardIds.length ? { ...record, shardIds } : { ...record };
		});
}
