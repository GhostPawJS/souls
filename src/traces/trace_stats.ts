import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { listTraces } from './list_traces.ts';
import { traceChain } from './trace_chain.ts';
import { clock } from './trace_clock.ts';
import { traceTablesExist } from './trace_tables_exist.ts';
import type { TraceOptions } from './types.ts';
export function traceStats(
	db: SoulsDb,
	options: TraceOptions & { soulId?: number; withSoulId?: number; halfLifeDays?: number } = {},
) {
	const now = clock(options);
	const halfLife = options.halfLifeDays ?? 30;
	if (!Number.isFinite(halfLife) || halfLife <= 0)
		throw new SoulsValidationError('halfLifeDays must be positive');
	if (!traceTablesExist(db))
		return { overdue: [], promiseSettleRate: null, chains: [], weights: [] };
	const overdue = db
		.prepare(
			`SELECT l.soul_id AS soulId,count(*) AS count FROM soul_traces t JOIN soul_trace_souls l ON l.trace_id=t.id JOIN souls s ON s.id=l.soul_id WHERE l.role=0 AND t.state=0 AND t.due_at<? AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM soul_traces n WHERE n.supersedes=t.id) ${options.soulId === undefined ? '' : 'AND l.soul_id=?'} GROUP BY l.soul_id ORDER BY l.soul_id`,
		)
		.all<{ soulId: number; count: number }>(
			now,
			...(options.soulId === undefined ? [] : [options.soulId]),
		);
	let promiseSettleRate: number | null = null;
	if (options.soulId !== undefined && options.withSoulId !== undefined)
		promiseSettleRate =
			db
				.prepare(
					`SELECT 1.0*SUM(CASE WHEN t.state=1 THEN 1 ELSE 0 END)/NULLIF(SUM(CASE WHEN t.state IN (1,2) OR (t.state=0 AND t.due_at<?) THEN 1 ELSE 0 END),0) AS rate FROM soul_traces t WHERE t.due_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM soul_traces n WHERE n.supersedes=t.id) AND EXISTS (SELECT 1 FROM soul_trace_souls l WHERE l.trace_id=t.id AND l.soul_id=?) AND EXISTS (SELECT 1 FROM soul_trace_souls l WHERE l.trace_id=t.id AND l.soul_id=?)`,
				)
				.get<{ rate: number | null }>(now, options.soulId, options.withSoulId)?.rate ?? null;
	const traces = listTraces(db, { ...options, limit: 2147483647 }).traces;
	let weights: { id: number; weight: number }[];
	try {
		const rows = db
			.prepare(
				'SELECT id,COALESCE(weight,1)*pow(0.5,(?-created_at)/86400000.0/?) AS weight FROM soul_traces',
			)
			.all<{ id: number; weight: number }>(now, halfLife);
		weights = traces.map((t) => {
			const row = rows.find((r) => r.id === t.id) as { id: number; weight: number };
			return { ...row };
		});
	} catch (error) {
		if (!(error instanceof Error) || !error.message.includes('no such function: pow')) throw error;
		weights = traces.map((t) => ({
			id: t.id,
			weight: (t.weight ?? 1) * 0.5 ** ((now - t.createdAt) / 86400000 / halfLife),
		}));
	}
	const chains = traces.map((t) => ({ id: t.id, certainty: traceChain(db, t.id).certainty }));
	return { overdue: overdue.map((r) => ({ ...r })), promiseSettleRate, chains, weights };
}
