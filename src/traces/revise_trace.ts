import type { SoulsDb } from '../database.ts';
import { withTransaction } from '../with_transaction.ts';
import { snapshot } from './append_trace_revision.ts';
import { safeText } from './assert_trace_text.ts';
import { bump } from './bump_trace_revision.ts';
import { getTrace } from './get_trace.ts';
import { initTraceTables } from './init_trace_tables.ts';
import { requireTrace } from './require_trace.ts';
import { clock } from './trace_clock.ts';
import { time } from './trace_time.ts';
import { weight } from './trace_weight.ts';
import type { ReviseTraceInput, Trace } from './types.ts';
import { validateSupersedes } from './validate_supersedes.ts';
export function reviseTrace(db: SoulsDb, id: number, input: ReviseTraceInput): Trace {
	return withTransaction(db, () => {
		initTraceTables(db);
		const old = requireTrace(getTrace(db, id), id);
		const reason = safeText(input.reason, 'reason');
		const now = clock(input);
		const supersedes = input.supersedes === undefined ? old.supersedes : input.supersedes;
		validateSupersedes(db, id, supersedes);
		db.prepare('UPDATE soul_traces SET text=?,due_at=?,weight=?,supersedes=? WHERE id=?').run(
			input.text === undefined ? old.text : safeText(input.text, 'text'),
			input.dueAt === undefined
				? old.dueAt
				: input.dueAt === null
					? null
					: time(input.dueAt, 'dueAt', input),
			input.weight === undefined ? old.weight : weight(input.weight),
			supersedes,
			id,
		);
		bump(db, id, now);
		const trace = getTrace(db, id) as Trace;
		snapshot(db, trace, 'revise', reason, now);
		return trace;
	});
}
