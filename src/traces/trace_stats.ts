import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { listTraces } from './list_traces.ts';
import { traceChain } from './trace_chain.ts';
import { clock } from './trace_clock.ts';
import { traceTablesExist } from './trace_tables_exist.ts';
import type { TraceOptions } from './types.ts';
export function traceStats(
	db: SoulsDb,
	options: TraceOptions & {
		soulId?: number;
		withSoulId?: number;
		halfLifeDays?: number;
		includeRetired?: boolean;
	} = {},
) {
	const now = clock(options);
	const halfLife = options.halfLifeDays ?? 30;
	if (!Number.isFinite(halfLife) || halfLife <= 0)
		throw new SoulsValidationError('halfLifeDays must be positive');
	const empty = { done: 0, dropped: 0, overdueOpen: 0, rate: null as number | null };
	if (!traceTablesExist(db))
		return {
			overdue: [],
			promiseSettleRate: null,
			promiseSettleRateDetails: empty,
			chains: [],
			weights: [],
		};
	const traces = listTraces(db, { ...options, limit: 2147483647 }).traces;
	// json_each keeps the filtered ids in one bound parameter, including large stores.
	const ids = JSON.stringify(traces.map((t) => t.id));
	const filtered = 'JOIN json_each(?) f ON t.id=f.value';
	const overdue = db
		.prepare(
			`SELECT l.soul_id AS soulId,count(*) AS count FROM soul_traces t ${filtered} JOIN soul_trace_souls l ON l.trace_id=t.id JOIN souls s ON s.id=l.soul_id WHERE l.role=0 AND t.state=0 AND t.due_at<? ${options.includeRetired ? '' : 'AND s.deleted_at IS NULL'} ${options.soulId === undefined ? '' : 'AND l.soul_id=?'} GROUP BY l.soul_id ORDER BY l.soul_id`,
		)
		.all<{ soulId: number; count: number }>(
			ids,
			now,
			...(options.soulId === undefined ? [] : [options.soulId]),
		);
	let details = empty;
	if (options.soulId !== undefined && options.withSoulId !== undefined) {
		const counts = db
			.prepare(
				`SELECT COALESCE(SUM(t.state=1),0) AS done,COALESCE(SUM(t.state=2),0) AS dropped,COALESCE(SUM(t.state=0 AND t.due_at<?),0) AS overdueOpen FROM soul_traces t ${filtered} WHERE t.due_at IS NOT NULL AND EXISTS (SELECT 1 FROM soul_trace_souls l WHERE l.trace_id=t.id AND l.soul_id=? ${options.includeRetired ? '' : 'AND EXISTS (SELECT 1 FROM souls s WHERE s.id=l.soul_id AND s.deleted_at IS NULL)'})`,
			)
			.get<{ done: number; dropped: number; overdueOpen: number }>(
				now,
				ids,
				options.withSoulId,
			) as { done: number; dropped: number; overdueOpen: number };
		const denominator = counts.done + counts.dropped + counts.overdueOpen;
		details = { ...counts, rate: denominator ? counts.done / denominator : null };
	}
	let weights: { id: number; weight: number }[];
	try {
		weights = db
			.prepare(
				`SELECT t.id,COALESCE(t.weight,1)*pow(0.5,(?-t.created_at)/86400000.0/?) AS weight FROM soul_traces t ${filtered} ORDER BY t.updated_at DESC,t.id DESC`,
			)
			.all<{ id: number; weight: number }>(now, halfLife, ids)
			.map((r) => ({ ...r }));
	} catch (error) {
		if (!(error instanceof Error) || !error.message.includes('no such function: pow')) throw error;
		weights = traces.map((t) => ({
			id: t.id,
			weight: (t.weight ?? 1) * 0.5 ** ((now - t.createdAt) / 86400000 / halfLife),
		}));
	}
	const heads = new Set(
		db
			.prepare(
				'SELECT id FROM soul_traces t WHERE NOT EXISTS (SELECT 1 FROM soul_traces n WHERE n.supersedes=t.id)',
			)
			.all<{ id: number }>()
			.map((r) => r.id),
	);
	const chains = traces
		.filter((t) => heads.has(t.id))
		.map((t) => ({ id: t.id, certainty: traceChain(db, t.id).certainty }));
	return {
		overdue: overdue.map((r) => ({ ...r })),
		promiseSettleRate: details.rate,
		promiseSettleRateDetails: details,
		chains,
		weights,
	};
}
