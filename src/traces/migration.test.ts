import { deepStrictEqual, ok, strictEqual } from 'node:assert';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import * as read from '../read.ts';
import { initShardTables } from '../shards/init_shard_tables.ts';
import { openSoulsDb } from '../surface/open_souls_db.ts';
import * as write from '../write.ts';

const NOW = Date.UTC(2026, 10, 10);
function digest(path: string) {
	return createHash('sha256').update(readFileSync(path)).digest('hex');
}
function dump(db: SoulsDb, tables: string[]) {
	return Object.fromEntries(
		tables.map((name) => [name, db.prepare(`SELECT * FROM "${name}"`).all()]),
	);
}
it('migrates shard metadata additively, then reads without changing schema or file bytes; first trace write preserves every old row', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'souls-trace-migration-'));
	const path = join(dir, 'old.db');
	try {
		const raw = new DatabaseSync(path);
		// SQLite creates sqlite_sequence and FTS shadow tables automatically; their dump declarations cannot be replayed.
		const schema = readFileSync(
			new URL('./fixtures/souls-0.5.1.schema.sql', import.meta.url),
			'utf8',
		)
			.replace('CREATE TABLE sqlite_sequence(name,seq);', '')
			.replace(/CREATE TABLE IF NOT EXISTS 'shard_fts_[^;]+;/g, '');
		raw.exec(schema);
		raw
			.prepare(
				'INSERT INTO souls(id,name,essence,description,created_at,updated_at) VALUES (1,?,?,?,?,?)',
			)
			.run('Mentor', 'Read intent', 'Reviewer', NOW, NOW);
		raw
			.prepare(
				'INSERT INTO soul_shards(id,content,source,created_at,updated_at) VALUES (1,?,?,?,?)',
			)
			.run('Reviewed the schema', 'review', NOW, NOW);
		raw.exec('INSERT INTO shard_souls VALUES(1,1)');
		raw.exec(`INSERT INTO soul_traits(id,soul_id,principle,provenance,generation,created_at,updated_at) VALUES(1,1,'Verify migrations','Observed',1,1794268800000,1794268800000);
 INSERT INTO shard_citations VALUES(1,1,1794268800000);
 INSERT INTO shard_tags VALUES(1,'migration');
 INSERT INTO soul_revisions(entity,entity_id,soul_id,new_text,created_at) VALUES('trait',1,1,'Verify migrations',1794268800000);
 INSERT INTO soul_revision_shards VALUES(1,1);
 INSERT INTO souls_settings VALUES('strict','false');
 INSERT INTO soul_levels(soul_id,level,essence_before,essence_after,created_at) VALUES(1,2,'Earlier','Read intent',1794268800000);
 INSERT INTO soul_publications(soul_id,path,marker,file_hash,block_hash,created_at) VALUES(1,'fixture.md','souls','hash','hash',1794268800000);
 INSERT INTO soul_reviews(soul_id,reason,created_at) VALUES(1,'Synthetic review',1794268800000);`);
		const sequences = raw.prepare('SELECT * FROM sqlite_sequence ORDER BY name').all();

		const tables = raw
			.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
			.all()
			.map((r) => String(r.name))
			.filter((n) => n !== 'sqlite_sequence');
		const oldRows = dump(raw as unknown as SoulsDb, tables);
		initShardTables(raw as unknown as SoulsDb);
		const before = dump(raw as unknown as SoulsDb, tables);
		deepStrictEqual(before, {
			...oldRows,
			soul_shards: oldRows.soul_shards?.map((row) =>
				Object.assign(Object.create(null), row, {
					withdrawn_at: null,
					withdrawal_reason: null,
					superseded_by: null,
				}),
			),
		});
		const version = raw.prepare('PRAGMA schema_version').get()?.schema_version;
		raw.close();
		const hash = digest(path);
		let db = await openSoulsDb(path);
		strictEqual(db.prepare('PRAGMA schema_version').get()?.schema_version, version);
		strictEqual(digest(path), hash);
		read.renderSoul(db, 1);
		read.renderPublication(db, 1);
		read.listSouls(db);
		read.getSoulProfile(db, 1);
		read.crystallizationReadiness(db);
		read.formatEvidence(db, 1);
		read.listShards(db);
		read.getRevisionHistory(db);
		read.getTrace(db, 1);
		read.traceTablesExist(db);
		read.listTraces(db);
		read.dueTraces(db, { now: NOW });
		read.traceHistory(db, 1);
		read.traceChain(db, 1);
		read.changedSince(db, NOW - 1, { now: NOW });
		read.traceStats(db, { now: NOW });
		strictEqual(db.prepare('PRAGMA schema_version').get()?.schema_version, version);
		strictEqual(digest(path), hash);
		db.close();
		strictEqual(digest(path), hash);
		db = await openSoulsDb(path);
		const rendered = read.renderSoul(db, 1);
		write.recordTrace(db, { text: 'Review next draft', souls: [{ soulId: 1, role: 0 }], now: NOW });
		ok(read.traceTablesExist(db));
		deepStrictEqual(dump(db, tables), before);
		deepStrictEqual(
			db
				.prepare("SELECT * FROM sqlite_sequence WHERE name<>'soul_trace_revisions' ORDER BY name")
				.all(),
			sequences,
		);
		strictEqual(read.renderSoul(db, 1), rendered);
		const migratedVersion = db.prepare('PRAGMA schema_version').get()?.schema_version;
		const afterWriteHash = digest(path);
		read.changedSince(db, NOW - 1, { now: NOW });
		read.traceStats(db, { now: NOW });
		read.traceHistory(db, 1);
		read.traceChain(db, 1);
		strictEqual(digest(path), afterWriteHash);
		strictEqual(db.prepare('PRAGMA schema_version').get()?.schema_version, migratedVersion);
		db.close();
		const migratedHash = digest(path);
		db = await openSoulsDb(path);
		strictEqual(db.prepare('PRAGMA schema_version').get()?.schema_version, migratedVersion);
		strictEqual(digest(path), migratedHash);
		deepStrictEqual(dump(db, tables), before);
		deepStrictEqual(
			db
				.prepare("SELECT * FROM sqlite_sequence WHERE name<>'soul_trace_revisions' ORDER BY name")
				.all(),
			sequences,
		);
		db.close();
		strictEqual(digest(path), migratedHash);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});
