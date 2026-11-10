import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { normalizeTags } from '../shards/normalize_tag.ts';
import { getSoulOrThrow } from '../souls/get_soul_or_throw.ts';
import { withTransaction } from '../with_transaction.ts';
import { snapshot } from './append_trace_revision.ts';
import { safeText } from './assert_trace_text.ts';
import { getTrace } from './get_trace.ts';
import { initTraceTables } from './init_trace_tables.ts';
import { roleCode } from './role_code.ts';
import { settleTrace } from './settle_trace.ts';
import { clock } from './trace_clock.ts';
import { time } from './trace_time.ts';
import { weight } from './trace_weight.ts';
import type { RecordTraceInput, Trace } from './types.ts';
import { validateSupersedes } from './validate_supersedes.ts';
export function recordTrace(db: SoulsDb, input: RecordTraceInput): Trace {
	return withTransaction(db, () => {
		initTraceTables(db);
		const text = safeText(input.text, 'text');
		const reason = input.reason === undefined ? undefined : safeText(input.reason, 'reason');
		if (!Array.isArray(input.souls) || input.souls.length === 0)
			throw new SoulsValidationError('souls requires at least one soul link');
		for (const link of input.souls) {
			getSoulOrThrow(db, link.soulId);
			roleCode(link.role);
		}
		const clockNow = clock(input);
		const created =
			input.createdAt === undefined ? clockNow : time(input.createdAt, 'createdAt', input);
		const now = input.import
			? input.updatedAt === undefined
				? created
				: time(input.updatedAt, 'updatedAt', input)
			: clockNow;
		const parents = [input.supersedes, ...(input.mergedFrom ?? [])].filter((p) => p != null);
		if (new Set(parents).size !== parents.length)
			throw new SoulsValidationError('Duplicate supersedes parent');
		validateSupersedes(db, null, input.supersedes ?? null);
		const result = db
			.prepare(
				'INSERT INTO soul_traces(text,weight,created_at,updated_at,due_at,supersedes) VALUES (?,?,?,?,?,?)',
			)
			.run(
				text,
				weight(input.weight),
				created,
				now,
				input.dueAt == null ? null : time(input.dueAt, 'dueAt', input),
				input.supersedes ?? null,
			);
		const id = Number(result.lastInsertRowid);
		for (const link of input.souls)
			db.prepare('INSERT OR IGNORE INTO soul_trace_souls VALUES (?,?,?,?)').run(
				id,
				link.soulId,
				roleCode(link.role),
				now,
			);
		for (const tag of normalizeTags(input.tags ?? []))
			db.prepare('INSERT INTO soul_trace_tags VALUES (?,?)').run(id, tag);
		for (const parent of input.mergedFrom ?? []) {
			validateSupersedes(db, id, parent);
			db.prepare('INSERT INTO soul_trace_merges VALUES (?,?,?)').run(id, parent, now);
		}
		const trace = getTrace(db, id) as Trace;
		snapshot(db, trace, 'record', input.import ? 'import' : reason, now);
		return input.settle ? settleTrace(db, id, { ...input, ...input.settle, now }) : trace;
	});
}
