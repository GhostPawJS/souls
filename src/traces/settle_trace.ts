import type { SoulsDb } from '../database.ts';
import { SoulsConflictError, SoulsValidationError } from '../errors.ts';
import { withTransaction } from '../with_transaction.ts';
import { snapshot } from './append_trace_revision.ts';
import { safeText } from './assert_trace_text.ts';
import { bump } from './bump_trace_revision.ts';
import { getTrace } from './get_trace.ts';
import { initTraceTables } from './init_trace_tables.ts';
import { requireTrace } from './require_trace.ts';
import { clock } from './trace_clock.ts';
import { time } from './trace_time.ts';
import type { Trace, TraceOptions, TraceTime } from './types.ts';
export function settleTrace(
	db: SoulsDb,
	id: number,
	input: TraceOptions & { as: 'done' | 'dropped'; reason: string; at?: TraceTime },
): Trace {
	return withTransaction(db, () => {
		initTraceTables(db);
		const old = requireTrace(getTrace(db, id), id);
		const reason = safeText(input.reason, 'reason');
		if (!['done', 'dropped'].includes(input.as))
			throw new SoulsValidationError('as must be done|dropped');
		if (old.state !== 'open') throw new SoulsConflictError(`Trace #${id} is already settled`);
		const now = clock(input);
		db.prepare('UPDATE soul_traces SET state=?,settled_at=?,settle_reason=? WHERE id=?').run(
			input.as === 'done' ? 1 : 2,
			input.at === undefined ? now : time(input.at, 'at', input),
			reason,
			id,
		);
		bump(db, id, now);
		const trace = getTrace(db, id) as Trace;
		snapshot(db, trace, 'settle', reason, now);
		return trace;
	});
}
