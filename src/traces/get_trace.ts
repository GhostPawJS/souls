import type { SoulsDb } from '../database.ts';
import { roles } from './trace_roles.ts';
import { traceTablesExist } from './trace_tables_exist.ts';
import type { Trace, TraceRole, TraceState } from './types.ts';
export function getTrace(db: SoulsDb, id: number): Trace | null {
	if (!traceTablesExist(db)) return null;
	const row = db.prepare('SELECT * FROM soul_traces WHERE id=?').get<{
		id: number;
		text: string;
		state: number;
		weight: number | null;
		created_at: number;
		updated_at: number;
		due_at: number | null;
		settled_at: number | null;
		settle_reason: string | null;
		supersedes: number | null;
		revision: number;
	}>(id);
	if (!row) return null;
	return {
		id: row.id,
		text: row.text,
		state: ['open', 'done', 'dropped'][row.state] as TraceState,
		weight: row.weight,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		dueAt: row.due_at,
		settledAt: row.settled_at,
		settleReason: row.settle_reason,
		supersedes: row.supersedes,
		revision: row.revision,
		souls: db
			.prepare(
				'SELECT soul_id,role,created_at FROM soul_trace_souls WHERE trace_id=? ORDER BY soul_id,role',
			)
			.all<{ soul_id: number; role: number; created_at: number }>(id)
			.map((r) => ({
				soulId: r.soul_id,
				role: roles[r.role] as TraceRole,
				createdAt: r.created_at,
			})),
		tags: db
			.prepare('SELECT tag FROM soul_trace_tags WHERE trace_id=? ORDER BY tag')
			.all<{ tag: string }>(id)
			.map((r) => r.tag),
	};
}
