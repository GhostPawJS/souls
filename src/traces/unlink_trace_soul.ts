import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { getSoulOrThrow } from '../souls/get_soul_or_throw.ts';
import { safeText } from './assert_trace_text.ts';
import { changeTrace } from './change_trace.ts';
import { roleCode } from './role_code.ts';
import type { Trace, TraceOptions, TraceRole } from './types.ts';
export function unlinkTraceSoul(
	db: SoulsDb,
	id: number,
	soulId: number,
	role: TraceRole | 0 | 1 | 2,
	options: TraceOptions & { reason: string },
): Trace {
	return changeTrace(db, id, 'unlink', options, () => {
		getSoulOrThrow(db, soulId);
		safeText(options.reason, 'reason');
		db.prepare('DELETE FROM soul_trace_souls WHERE trace_id=? AND soul_id=? AND role=?').run(
			id,
			soulId,
			roleCode(role),
		);
		if (!db.prepare('SELECT 1 FROM soul_trace_souls WHERE trace_id=?').get(id))
			throw new SoulsValidationError('Cannot remove the last soul link');
	});
}
