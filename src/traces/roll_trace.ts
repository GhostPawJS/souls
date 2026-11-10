import type { SoulsDb } from '../database.ts';
import { withTransaction } from '../with_transaction.ts';
import { getTrace } from './get_trace.ts';
import { recordTrace } from './record_trace.ts';
import { requireTrace } from './require_trace.ts';
import { settleTrace } from './settle_trace.ts';
import type { TraceOptions, TraceTime } from './types.ts';
import { validateSupersedes } from './validate_supersedes.ts';
export function rollTrace(
	db: SoulsDb,
	id: number,
	input: TraceOptions & {
		nextDue: TraceTime;
		as?: 'done' | 'dropped';
		reason?: string;
		at?: TraceTime;
		text?: string;
	},
) {
	return withTransaction(db, () => {
		const old = requireTrace(getTrace(db, id), id);
		validateSupersedes(db, null, id);
		settleTrace(db, id, {
			...input,
			as: input.as ?? 'done',
			reason: input.reason ?? 'rolled forward',
		});
		return recordTrace(db, {
			...input,
			text: input.text ?? old.text,
			souls: old.souls,
			tags: old.tags,
			weight: old.weight,
			dueAt: input.nextDue,
			supersedes: id,
		});
	});
}
