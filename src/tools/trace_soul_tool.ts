import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { resolveSoulReference } from '../souls/resolve_soul_reference.ts';
import type { RecordTraceInput, Trace, TraceRole, TraceTime } from '../traces/types.ts';
import { withTransaction } from '../with_transaction.ts';
import * as write from '../write.ts';
import { translateToolError } from './tool_errors.ts';
import {
	arraySchema,
	defineSoulsTool,
	integerSchema,
	numberSchema,
	objectSchema,
	soulReferenceSchema,
	stringSchema,
} from './tool_metadata.ts';
import { traceSoulToolName } from './tool_names.ts';
import { toTraceRef } from './tool_ref.ts';
import { type ToolResult, toolNeedsClarification, toolSuccess } from './tool_types.ts';
import { validateToolInput } from './validate_tool_input.ts';
export const traceExample =
	'{"action":"record","text":"Review the draft","souls":[{"soul":"mentor","role":"owner"}],"dueAt":"2026-11-12","tags":["promise"],"weight":0.8}';
export interface TraceSoulInput {
	action: 'record' | 'revise' | 'settle' | 'link' | 'unlink' | 'tag' | 'untag' | 'cite';
	id?: number;
	traceId?: number;
	shardId?: number;
	text?: string;
	reason?: string;
	souls?: { soul: number | string; role: TraceRole | 0 | 1 | 2 }[];
	tags?: string[];
	dueAt?: TraceTime | null;
	createdAt?: TraceTime;
	at?: TraceTime;
	now?: TraceTime;
	tz?: string;
	weight?: number | null;
	supersedes?: number | null;
	as?: 'done' | 'dropped';
}
export function traceSoulToolHandler(db: SoulsDb, input: TraceSoulInput): ToolResult<Trace> {
	const invalid = validateToolInput(traceSoulTool, input);
	if (invalid) {
		invalid.error.recovery = `Example input: ${traceExample}`;
		return invalid;
	}
	try {
		const links = input.souls?.map((l) => ({
			soulId: typeof l.soul === 'number' ? l.soul : resolveSoulReference(db, l.soul),
			role: l.role,
		}));
		const need = (fields: string[]) =>
			toolNeedsClarification(
				'missing_required_choice',
				`Provide ${fields.join(', ')}. Example input: ${traceExample}`,
				fields,
			);
		let trace: Trace;
		if (input.action === 'record') {
			if (!input.text || !links?.length) return need(['text', 'souls']);
			trace = write.recordTrace(db, {
				...input,
				text: input.text,
				souls: links,
			} as RecordTraceInput);
		} else {
			const id = input.id ?? input.traceId;
			if (!id) return need(['id']);
			switch (input.action) {
				case 'revise':
					if (!input.reason) return need(['reason']);
					trace = write.reviseTrace(db, id, { ...input, reason: input.reason });
					break;
				case 'settle':
					if (!input.reason || !input.as) return need(['as', 'reason']);
					trace = write.settleTrace(db, id, { ...input, reason: input.reason, as: input.as });
					break;
				case 'link':
				case 'unlink': {
					if (!links?.length) return need(['souls']);
					if (input.action === 'unlink' && !input.reason) return need(['reason']);
					trace = withTransaction(db, () => {
						let updated: Trace | undefined;
						for (const link of links) {
							updated =
								input.action === 'unlink'
									? write.unlinkTraceSoul(db, id, link.soulId, link.role, {
											...input,
											reason: input.reason as string,
										})
									: write.linkTraceSoul(db, id, link.soulId, link.role, input);
						}
						return updated as Trace;
					});
					break;
				}
				case 'tag':
				case 'untag':
					if (!input.tags?.length) return need(['tags']);
					if (input.action === 'untag') {
						if (!input.reason) return need(['reason']);
						trace = write.untagTrace(db, id, input.tags, { ...input, reason: input.reason });
					} else trace = write.tagTrace(db, id, input.tags, input);
					break;
				case 'cite':
					if (!input.shardId) return need(['shardId']);
					trace = write.citeTrace(db, input.shardId, id, input);
					break;
				default:
					throw new SoulsValidationError('Unknown trace action');
			}
		}
		return toolSuccess(`Trace #${trace.id} ${input.action}.`, trace, {
			entities: [toTraceRef(trace)],
			next: [
				{
					kind: 'use_tool',
					message: 'Review this trace.',
					tool: 'review_traces',
					suggestedInput: { view: 'show', id: trace.id },
				},
			],
		});
	} catch (error) {
		const result = translateToolError(error, { summary: 'Could not change trace.' });
		if (result.outcome === 'error') result.error.recovery = `Example input: ${traceExample}`;
		return result;
	}
}
const dateSchema = { oneOf: [{ type: 'integer' as const }, { type: 'string' as const }] };
export const traceSoulTool = defineSoulsTool<TraceSoulInput, Trace>({
	name: traceSoulToolName,
	description:
		'Record persistent facts and commitments, revise, settle, link, tag, or cite traces.',
	whenToUse: 'Use for dated facts, promises, beliefs, approvals, and decisions.',
	whenNotToUse: 'Use observe_soul for behavioral interpretations and review_traces for reading.',
	sideEffects: 'writes_state',
	readOnly: false,
	supportsClarification: true,
	targetKinds: ['trace', 'soul', 'shard'],
	inputDescriptions: { action: 'record, revise, settle, link, unlink, tag, untag, cite.' },
	outputDescription: 'Trace with top-level id, links, tags, state and revision.',
	inputSchema: objectSchema(
		{
			action: {
				type: 'string',
				enum: ['record', 'revise', 'settle', 'link', 'unlink', 'tag', 'untag', 'cite'],
			},
			id: integerSchema('Trace id.'),
			traceId: integerSchema('Trace id alias.'),
			shardId: integerSchema('Citing shard id.'),
			text: stringSchema('Fact or commitment; never credentials.'),
			reason: stringSchema('Reason for this change.'),
			souls: arraySchema(
				objectSchema(
					{
						soul: soulReferenceSchema('Linked soul.'),
						role: {
							oneOf: [
								{ type: 'string', enum: ['owner', 'counterpart', 'subject'] },
								{ type: 'integer', enum: [0, 1, 2] },
							],
						},
					},
					['soul', 'role'],
				),
				'Soul links.',
			),
			tags: arraySchema(stringSchema('Category.'), 'Category tags.'),
			dueAt: { oneOf: [...dateSchema.oneOf, { type: 'null' }] },
			createdAt: dateSchema,
			at: dateSchema,
			now: dateSchema,
			tz: stringSchema('IANA time zone.'),
			weight: { oneOf: [numberSchema('Weight between 0 and 1; null clears.'), { type: 'null' }] },
			supersedes: { oneOf: [integerSchema('Trace being corrected.'), { type: 'null' }] },
			as: { type: 'string', enum: ['done', 'dropped'] },
		},
		['action'],
	),
	handler: traceSoulToolHandler,
});
