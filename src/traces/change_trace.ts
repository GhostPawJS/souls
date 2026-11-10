import type { SoulsDb } from '../database.ts';
import { withTransaction } from '../with_transaction.ts';
import { snapshot } from './append_trace_revision.ts';
import { safeText } from './assert_trace_text.ts';
import { bump } from './bump_trace_revision.ts';
import { getTrace } from './get_trace.ts';
import { initTraceTables } from './init_trace_tables.ts';
import { requireTrace } from './require_trace.ts';
import { clock } from './trace_clock.ts';
import type { Trace, TraceOptions } from './types.ts';
export function changeTrace(
	db: SoulsDb,
	id: number,
	kind: string,
	options: TraceOptions & { reason?: string },
	change: (now: number) => void,
): Trace {
	return withTransaction(db, () => {
		initTraceTables(db);
		requireTrace(getTrace(db, id), id);
		const reason = options.reason === undefined ? undefined : safeText(options.reason, 'reason');
		const now = clock(options);
		change(now);
		bump(db, id, now);
		const trace = getTrace(db, id) as Trace;
		snapshot(db, trace, kind, reason, now);
		return trace;
	});
}
