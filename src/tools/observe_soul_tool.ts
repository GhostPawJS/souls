import type { SoulsDb } from '../database.ts';
import type { DropShardInput, DropShardsResult, ShardRecord } from '../shards/types.ts';
import * as write from '../write.ts';
import { translateToolError } from './tool_errors.ts';
import {
	arraySchema,
	booleanSchema,
	defineSoulsTool,
	integerArraySchema,
	objectSchema,
	stringArraySchema,
	stringSchema,
} from './tool_metadata.ts';
import { observeSoulToolName } from './tool_names.ts';
import { inspectSoulsItemNext } from './tool_next.ts';
import { toShardRef } from './tool_ref.ts';
import { summarizeCount } from './tool_summary.ts';
import type { ToolResult } from './tool_types.ts';
import { toolSuccess, toolWarning } from './tool_types.ts';

export interface ObserveSoulDropData {
	shardId: number;
	shard: ShardRecord;
	crystallizationTriggers: number[];
}

export interface ObserveSoulBatchData {
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
	input: {
		action: 'drop' | 'drop_batch' | 'reveal';
		content?: string | undefined;
		source?: string | undefined;
		soulIds?: number[] | undefined;
		tags?: string[] | undefined;
		sealed?: boolean | undefined;
		shards?: DropShardInput[] | undefined;
		shardIds?: number[] | undefined;
	},
): ObserveSoulToolResult {
	try {
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
			const result = write.dropShard(db, {
				content: input.content,
				source: input.source,
				soulIds: input.soulIds,
				tags: input.tags,
				sealed: input.sealed,
			});
			const data: ObserveSoulDropData = {
				shardId: result.shard.id,
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
				`Shard ${result.shard.id} deposited${result.crystallizationTriggers.length > 0 ? ' — crystallization threshold reached' : ''}.`,
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
			const result = write.dropShards(db, input.shards);
			const data: ObserveSoulBatchData = {
				result,
				shardCount: result.shards.length,
				crystallizationTriggers: result.crystallizationTriggers,
			};
			return toolSuccess(`${summarizeCount(result.shards.length, 'shard')} deposited.`, data, {
				entities: result.shards.map(toShardRef),
			});
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
			content: stringSchema('Behavioral observation text.'),
			source: stringSchema('Evidence channel origin label.'),
			soulIds: integerArraySchema('Soul IDs to attribute this observation to.'),
			tags: stringArraySchema('Optional topic tags.'),
			sealed: booleanSchema('If true, shard is deferred until revealed.'),
			shards: arraySchema(
				objectSchema(
					{ content: stringSchema(''), source: stringSchema(''), soulIds: integerArraySchema('') },
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
