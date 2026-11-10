import type { SoulsDb } from '../database.ts';
import type { Trace } from './types.ts';
export function snapshot(
	db: SoulsDb,
	trace: Trace,
	kind: string,
	reason: string | undefined,
	now: number,
): void {
	db.prepare(
		'INSERT INTO soul_trace_revisions(trace_id,revision,kind,snapshot,reason,created_at) VALUES (?,?,?,?,?,?)',
	).run(trace.id, trace.revision, kind, JSON.stringify(trace), reason ?? null, now);
}
