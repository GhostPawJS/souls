import type { SoulsDb } from '../database.ts';
import type { DropShardInput, DropShardsResult, ShardRecord } from '../shards/types.ts';
import * as write from '../write.ts';
import { resolveToolSoulReferences } from './resolve_tool_soul_references.ts';
import { translateToolError } from './tool_errors.ts';
import {
	arraySchema,
	booleanSchema,
	defineSoulsTool,
	integerArraySchema,
	integerSchema,
	numberSchema,
	objectSchema,
	soulReferenceSchema,
	stringArraySchema,
	stringSchema,
	integerSchema as thresholdIntegerSchema,
} from './tool_metadata.ts';
import { observeSoulToolName } from './tool_names.ts';
import { inspectSoulsItemNext } from './tool_next.ts';
import { toShardRef } from './tool_ref.ts';
import { summarizeCount } from './tool_summary.ts';
import type { ToolResult } from './tool_types.ts';
import { toolSuccess, toolWarning } from './tool_types.ts';
import { validateToolInput } from './validate_tool_input.ts';

export interface ObserveSoulDropData {
	duplicate?: boolean;
	shardId: number;
	shard: ShardRecord;
	crystallizationTriggers: number[];
}

export interface ObserveSoulBatchData {
	duplicates: number;
	result: DropShardsResult;
	shardCount: number;
	crystallizationTriggers: number[];
}

export interface ObserveSoulRevealData {
	revealedCount: number;
}

export type ObserveSoulToolData =
	| ObserveSoulDropData
	| ObserveSoulBatchData
	| ObserveSoulRevealData;

export type ObserveSoulToolResult = ToolResult<ObserveSoulToolData>;

export function observeSoulToolHandler(
	db: SoulsDb,
	rawInput: {
		minSourceDiversity?: number | undefined;
		minSpreadDays?: number | undefined;
		action: 'drop' | 'drop_batch' | 'reveal';
		content?: string | undefined;
		occurredAt?: number | string | undefined;
		idempotencyKey?: string | undefined;
		ref?: string | undefined;
		now?: number | undefined;
		source?: string | undefined;
		soulIds?: (number | string)[] | undefined;
		tags?: string[] | undefined;
		sealed?: boolean | undefined;
		shards?: (Omit<DropShardInput, 'soulIds'> & { soulIds: (number | string)[] })[] | undefined;
		shardIds?: number[] | undefined;
	},
): ObserveSoulToolResult {
	const invalid = validateToolInput(observeSoulTool, rawInput);
	if (invalid) return invalid;
	try {
		const input = resolveToolSoulReferences(db, rawInput);
		if (input.action === 'drop') {
			if (!input.content || !input.source || !input.soulIds) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'content, source, and soulIds are required for drop.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide content, source, and soulIds.',
						missing: ['content', 'source', 'soulIds'].filter(
							(f) => !input[f as keyof typeof input],
						),
					},
				};
			}
			const result = write.dropShard(
				db,
				{
					content: input.content,
					source: input.source,
					soulIds: input.soulIds,
					tags: input.tags,
					sealed: input.sealed,
					now: typeof input.occurredAt === 'number' ? input.occurredAt : input.now,
					occurredAt: input.occurredAt,
					idempotencyKey: input.idempotencyKey,
					ref: input.ref,
				},
				{
					insertedAt: input.now ?? Date.now(),
					minSourceDiversity: input.minSourceDiversity,
					minSpreadDays: input.minSpreadDays,
				},
			);
			const data: ObserveSoulDropData = {
				shardId: result.shard.id,
				...(result.duplicate ? { duplicate: true } : {}),
				shard: result.shard,
				crystallizationTriggers: result.crystallizationTriggers,
			};
			const warnings =
				result.crystallizationTriggers.length > 0
					? [
							toolWarning(
								'partial_match',
								`${summarizeCount(result.crystallizationTriggers.length, 'soul')} reached crystallization readiness.`,
							),
						]
					: undefined;
			const next = result.crystallizationTriggers.map((id) => inspectSoulsItemNext(id));
			for (const soulId of input.soulIds) {
				next.push(inspectSoulsItemNext(soulId));
			}
			return toolSuccess(
				result.duplicate
					? `Shard ${result.shard.id} already recorded (duplicate idempotency key).`
					: `Shard ${result.shard.id} deposited${result.crystallizationTriggers.length > 0 ? ' — crystallization threshold reached' : ''}.`,
				data,
				{ entities: [toShardRef(result.shard)], next, warnings },
			);
		}

		if (input.action === 'drop_batch') {
			if (!input.shards || input.shards.length === 0) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'shards array is required for drop_batch.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide a non-empty shards array.',
						missing: ['shards'],
					},
				};
			}
			const result = write.dropShards(db, input.shards, input);
			const duplicates = result.results?.filter((item) => item.duplicate).length ?? 0;
			const data: ObserveSoulBatchData = {
				duplicates,
				result,
				shardCount: result.shards.length,
				crystallizationTriggers: result.crystallizationTriggers,
			};
			return toolSuccess(
				duplicates > 0
					? `${summarizeCount(result.shards.length - duplicates, 'shard')} deposited, ${summarizeCount(duplicates, 'duplicate')} skipped.`
					: `${summarizeCount(result.shards.length, 'shard')} deposited.`,
				data,
				{
					entities: result.shards.map(toShardRef),
				},
			);
		}

		if (input.action === 'reveal') {
			if (!input.shardIds || input.shardIds.length === 0) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'shardIds is required for reveal.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide a non-empty shardIds array.',
						missing: ['shardIds'],
					},
				};
			}
			const revealed = write.revealShards(db, input.shardIds);
			const data: ObserveSoulRevealData = { revealedCount: revealed.length };
			return toolSuccess(`${summarizeCount(revealed.length, 'sealed shard')} revealed.`, data, {
				entities: revealed.map(toShardRef),
			});
		}

		return translateToolError(new Error(`Unknown action: ${String(input.action)}`), {
			summary: 'Invalid action for observe_soul.',
		});
	} catch (error) {
		return translateToolError(error, { summary: 'Could not deposit observation.' });
	}
}

export const observeSoulTool = defineSoulsTool<
	Parameters<typeof observeSoulToolHandler>[1],
	ObserveSoulToolData
>({
	name: observeSoulToolName,
	description:
		'Deposit behavioral observations (shards) for one or more souls, or reveal previously sealed shards.',
	whenToUse:
		'Use this whenever you have a behavioral observation to record — delegation outcome, session note, reflection, feedback. Use drop_batch for importing multiple observations at once. Use reveal to unlock deferred shards at the appropriate moment (task completion, session close).',
	whenNotToUse:
		'Do not use this to read evidence — use search_souls or inspect_souls_item. Do not use this to add traits — use refine_soul.',
	sideEffects: 'writes_state',
	readOnly: false,
	supportsClarification: true,
	targetKinds: ['shard', 'soul'],
	inputDescriptions: {
		action: 'drop: single shard, drop_batch: multiple shards at once, reveal: unseal shards.',
		content: 'The behavioral observation text (for drop).',
		source: 'The evidence channel origin label, e.g. "delegation", "manual_review" (for drop).',
		soulIds: 'IDs of the souls this observation is attributed to (for drop).',
		tags: 'Optional topic tags, e.g. ["error_handling", "docker"] (for drop).',
		sealed: 'If true, shard is hidden until revealed (for drop).',
		shards: 'Array of shard inputs to deposit in one transaction (for drop_batch).',
		shardIds: 'IDs of sealed shards to reveal (for reveal).',
	},
	outputDescription: 'The deposited shard(s) with crystallization trigger notifications.',
	inputSchema: objectSchema(
		{
			action: { type: 'string', enum: ['drop', 'drop_batch', 'reveal'] },
			occurredAt: {
				oneOf: [{ type: 'integer' }, { type: 'string' }],
				description: 'Observation timestamp, ISO or epoch milliseconds.',
			},
			idempotencyKey: stringSchema('Unique ingestion key.'),
			ref: stringSchema('External evidence reference.'),
			now: integerSchema('Timestamp in epoch milliseconds; occurredAt takes precedence.'),
			minSourceDiversity: thresholdIntegerSchema('Minimum source diversity (default 2).'),
			minSpreadDays: numberSchema('Minimum occurrence spread in days (default 1).'),
			content: stringSchema('Behavioral observation text.'),
			source: stringSchema('Evidence channel origin label.'),
			soulIds: arraySchema(
				soulReferenceSchema('Soul IDs to attribute this observation to.'),
				'Soul IDs to attribute this observation to.',
			),
			tags: stringArraySchema('Optional topic tags.'),
			sealed: booleanSchema('If true, shard is deferred until revealed.'),
			shards: arraySchema(
				objectSchema(
					{
						content: stringSchema('Observation text.'),
						source: stringSchema('Evidence source.'),
						soulIds: arraySchema(soulReferenceSchema('Attributed souls.'), 'Attributed souls.'),
						tags: stringArraySchema('Topic tags.'),
						sealed: booleanSchema('Defer until revealed.'),
						occurredAt: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
						idempotencyKey: stringSchema('Unique ingestion key.'),
						ref: stringSchema('External evidence reference.'),
						now: integerSchema('Timestamp in epoch milliseconds.'),
					},
					['content', 'source', 'soulIds'],
				),
				'Array of shards for batch deposit.',
			),
			shardIds: integerArraySchema('Shard IDs to reveal.'),
		},
		['action'],
		'Deposit behavioral observations for a soul.',
	),
	handler: observeSoulToolHandler,
});
