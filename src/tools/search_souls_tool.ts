import type { SoulsDb } from '../database.ts';
import * as read from '../read.ts';
import type { ShardRecord } from '../shards/types.ts';
import { translateToolError } from './tool_errors.ts';
import {
	defineSoulsTool,
	integerSchema,
	objectSchema,
	stringArraySchema,
	stringSchema,
} from './tool_metadata.ts';
import { searchSoulsToolName } from './tool_names.ts';
import { inspectSoulsItemNext } from './tool_next.ts';
import { toSoulIdRef } from './tool_ref.ts';
import { summarizeCount } from './tool_summary.ts';
import type { ToolResult } from './tool_types.ts';
import { toolSuccess } from './tool_types.ts';

export interface SearchSoulsToolData {
	shards: ShardRecord[];
	count: number;
}

export type SearchSoulsToolResult = ToolResult<SearchSoulsToolData>;

export function searchSoulsToolHandler(
	db: SoulsDb,
	input: {
		query?: string | undefined;
		soulId?: number | undefined;
		tags?: string[] | undefined;
		limit?: number | undefined;
	},
): SearchSoulsToolResult {
	try {
		let shards: ShardRecord[];

		if (input.query) {
			shards = read.searchShards(db, input.query, {
				soulId: input.soulId,
				limit: input.limit,
			});
		} else {
			shards = read.listShards(db, {
				soulId: input.soulId,
				tags: input.tags,
				limit: input.limit,
			});
		}

		const summary = input.query
			? `${summarizeCount(shards.length, 'shard')} matching "${input.query}".`
			: `${summarizeCount(shards.length, 'pending shard')}.`;

		const next = input.soulId !== undefined ? [inspectSoulsItemNext(input.soulId)] : [];

		return toolSuccess(
			summary,
			{ shards, count: shards.length },
			{
				entities: input.soulId !== undefined ? [toSoulIdRef(input.soulId)] : [],
				next: next.length > 0 ? next : undefined,
			},
		);
	} catch (error) {
		return translateToolError(error, { summary: 'Could not search shards.' });
	}
}

export const searchSoulsTool = defineSoulsTool<
	Parameters<typeof searchSoulsToolHandler>[1],
	SearchSoulsToolData
>({
	name: searchSoulsToolName,
	description:
		'Search shards by content using full-text search, or list pending shards with optional filters.',
	whenToUse:
		'Use this to find specific observations by content (with query) or to browse pending shards (without query). Filter by soul, tags, or limit as needed.',
	whenNotToUse:
		'Do not use this to view the structured evidence report — use inspect_souls_item with includeEvidence. Do not use this to deposit observations — use observe_soul.',
	sideEffects: 'none',
	readOnly: true,
	supportsClarification: false,
	targetKinds: ['shard'],
	inputDescriptions: {
		query: 'FTS5 search query. Omit to list pending shards by recency.',
		soulId: 'Filter shards attributed to this soul.',
		tags: 'Filter shards by topic tags (for list mode only).',
		limit: 'Maximum results to return.',
	},
	outputDescription: 'Matching or listed shards with count.',
	inputSchema: objectSchema(
		{
			query: stringSchema('FTS5 search query. Omit to list pending shards.'),
			soulId: integerSchema('Filter by soul ID.'),
			tags: stringArraySchema('Filter by topic tags (list mode).'),
			limit: integerSchema('Maximum results.'),
		},
		[],
		'Search or list shards.',
	),
	handler: searchSoulsToolHandler,
});
