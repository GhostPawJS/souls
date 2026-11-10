import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import * as read from '../read.ts';
import { resolveSoulReference } from '../souls/resolve_soul_reference.ts';
import { requireTrace } from '../traces/require_trace.ts';
import { traceTablesExist } from '../traces/trace_tables_exist.ts';
import type { ListTracesOptions, TraceTime } from '../traces/types.ts';
import { translateToolError } from './tool_errors.ts';
import {
	booleanSchema,
	defineSoulsTool,
	integerSchema,
	numberSchema,
	objectSchema,
	soulReferenceSchema,
	stringSchema,
} from './tool_metadata.ts';
import { reviewTracesToolName } from './tool_names.ts';
import { type ToolResult, toolNeedsClarification, toolSuccess } from './tool_types.ts';
import { validateToolInput } from './validate_tool_input.ts';
export interface ReviewTracesInput extends Omit<ListTracesOptions, 'soulId'> {
	view: 'list' | 'due' | 'show' | 'history' | 'chain' | 'changed' | 'stats';
	id?: number;
	soulId?: number | string;
	withSoulId?: number | string;
	since?: TraceTime;
	within?: string | number;
	halfLifeDays?: number;
}
const example = '{"view":"list","soulId":"mentor","state":"open","limit":20}';
export function reviewTracesToolHandler(db: SoulsDb, input: ReviewTracesInput): ToolResult {
	const invalid = validateToolInput(reviewTracesTool, input);
	if (invalid) {
		invalid.error.recovery = `Example input: ${example}`;
		return invalid;
	}
	try {
		const options = {
			...input,
			...(input.soulId === undefined
				? {}
				: {
						soulId:
							typeof input.soulId === 'number'
								? input.soulId
								: resolveSoulReference(db, input.soulId),
					}),
			...(input.withSoulId === undefined
				? {}
				: {
						withSoulId:
							typeof input.withSoulId === 'number'
								? input.withSoulId
								: resolveSoulReference(db, input.withSoulId),
					}),
		} as ListTracesOptions & {
			withSoulId?: number;
			halfLifeDays?: number;
			within?: string | number;
		};
		let data: unknown;
		switch (input.view) {
			case 'list':
				data = read.listTraces(db, options);
				break;
			case 'due':
				data = read.dueTraces(db, options);
				break;
			case 'stats':
				data = read.traceStats(db, options);
				break;
			case 'changed':
				if (input.since === undefined)
					return toolNeedsClarification(
						'missing_required_choice',
						'Provide since. Example input: {"view":"changed","since":"2026-11-10","tz":"Europe/Berlin"}',
						['since'],
					);
				data = read.changedSince(db, input.since, options);
				break;
			case 'show':
			case 'history':
			case 'chain': {
				if (input.id === undefined)
					return toolNeedsClarification(
						'missing_required_choice',
						`Provide id. Example input: {"view":"${input.view}","id":1}`,
						['id'],
					);
				if (input.view === 'history') data = read.traceHistory(db, input.id);
				else if (input.view === 'chain') data = read.traceChain(db, input.id);
				else {
					const trace = requireTrace(read.getTrace(db, input.id), input.id);
					data = {
						...trace,
						chain: read.traceChain(db, input.id),
						shardIds: traceTablesExist(db)
							? db
									.prepare('SELECT shard_id FROM shard_traces WHERE trace_id=? ORDER BY shard_id')
									.all<{ shard_id: number }>(input.id)
									.map((r) => r.shard_id)
							: [],
					};
				}
				break;
			}
			default:
				throw new SoulsValidationError('Unknown trace view');
		}
		return toolSuccess(`Trace ${input.view}.`, data);
	} catch (error) {
		return translateToolError(error, {
			summary: `Could not review traces. Example input: ${example}`,
		});
	}
}
const dateSchema = { oneOf: [{ type: 'integer' as const }, { type: 'string' as const }] };
export const reviewTracesTool = defineSoulsTool<ReviewTracesInput, unknown>({
	name: reviewTracesToolName,
	description:
		'Read traces, due commitments, revision history, chains, store changes, and statistics.',
	whenToUse: 'Review persistent facts and commitments without writing.',
	whenNotToUse: 'Use trace_soul to write or settle traces.',
	sideEffects: 'none',
	readOnly: true,
	supportsClarification: true,
	targetKinds: ['trace', 'soul'],
	inputDescriptions: { view: 'list, due, show, history, chain, changed, stats.' },
	outputDescription: 'Trace records or requested read-only report.',
	inputSchema: objectSchema(
		{
			view: {
				type: 'string',
				enum: ['list', 'due', 'show', 'history', 'chain', 'changed', 'stats'],
			},
			id: integerSchema('Trace id.'),
			soulId: soulReferenceSchema('Linked soul.'),
			withSoulId: soulReferenceSchema('Other soul for settle rate.'),
			role: {
				oneOf: [
					{ type: 'string', enum: ['owner', 'counterpart', 'subject'] },
					{ type: 'integer', enum: [0, 1, 2] },
				],
			},
			state: { type: 'string', enum: ['open', 'done', 'dropped'] },
			tag: stringSchema('Category.'),
			query: stringSchema('Text substring.'),
			dueBefore: dateSchema,
			since: dateSchema,
			now: dateSchema,
			tz: stringSchema('IANA time zone.'),
			within: stringSchema('Window such as 3d or 12h.'),
			includeRetired: booleanSchema('Include retired souls.'),
			includeSuperseded: booleanSchema('Include chain ancestors.'),
			limit: integerSchema('Page size.'),
			offset: integerSchema('Page offset.'),
			halfLifeDays: numberSchema('Decay half life, default 30 days.'),
		},
		['view'],
	),
	handler: reviewTracesToolHandler,
});
