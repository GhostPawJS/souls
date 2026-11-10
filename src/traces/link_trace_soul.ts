import type { SoulsDb } from '../database.ts';
import { getSoulOrThrow } from '../souls/get_soul_or_throw.ts';
import { changeTrace } from './change_trace.ts';
import { roleCode } from './role_code.ts';
import type { Trace, TraceOptions, TraceRole } from './types.ts';
export function linkTraceSoul(
	db: SoulsDb,
	id: number,
	soulId: number,
	role: TraceRole | 0 | 1 | 2,
	options: TraceOptions & { reason?: string } = {},
): Trace {
	return changeTrace(db, id, 'link', options, (now) => {
		getSoulOrThrow(db, soulId);
		db.prepare('INSERT OR IGNORE INTO soul_trace_souls VALUES (?,?,?,?)').run(
			id,
			soulId,
			roleCode(role),
			now,
		);
	});
}
