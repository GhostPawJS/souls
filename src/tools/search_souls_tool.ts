import type { SoulsDb } from '../database.ts';
import * as read from '../read.ts';
import type { ShardRecord } from '../shards/types.ts';
import { resolveToolSoulReferences } from './resolve_tool_soul_references.ts';
import { translateToolError } from './tool_errors.ts';
import {
	defineSoulsTool,
	enumSchema,
	integerSchema,
	objectSchema,
	soulReferenceSchema,
	stringArraySchema,
	stringSchema,
} from './tool_metadata.ts';
import { searchSoulsToolName } from './tool_names.ts';
import { inspectSoulsItemNext } from './tool_next.ts';
import { toSoulIdRef } from './tool_ref.ts';
import { summarizeCount } from './tool_summary.ts';
import type { ToolSurfaceDefinition } from './tool_surface_definition.ts';
import type { ToolResult } from './tool_types.ts';
import { toolSuccess } from './tool_types.ts';
import { validateToolInput } from './validate_tool_input.ts';

export interface SearchSoulsToolData {
	shards: ShardRecord[];
	count: number;
	total: number;
	hasMore: boolean;
}

export type SearchSoulsToolResult = ToolResult<SearchSoulsToolData>;

export function searchSoulsToolHandler(
	db: SoulsDb,
	rawInput: {
		query?: string | undefined;
		status?: import('../shards/types.ts').ShardFilterStatus | undefined;
		offset?: number | undefined;
		soulId?: number | string | undefined;
		tags?: string[] | undefined;
		limit?: number | undefined;
	},
): SearchSoulsToolResult {
	const invalid = validateToolInput(searchSoulsToolSurface, rawInput);
	if (invalid) return invalid;
	try {
		const input = resolveToolSoulReferences(db, rawInput);
		const page = input.query
			? read.searchShardsPage(db, input.query, input)
			: read.listShardsPage(db, input);
		const shards = page.items;

		const summary = input.query
			? `${summarizeCount(shards.length, 'shard')} matching "${input.query}".`
			: `${summarizeCount(shards.length, 'pending shard')}.`;

		const next = input.soulId !== undefined ? [inspectSoulsItemNext(input.soulId)] : [];

		return toolSuccess(
			summary,
			{ shards, count: shards.length, total: page.total, hasMore: page.hasMore },
			{
				entities: input.soulId !== undefined ? [toSoulIdRef(input.soulId)] : [],
				next: next.length > 0 ? next : undefined,
			},
		);
	} catch (error) {
		return translateToolError(error, { summary: 'Could not search shards.' });
	}
}

export const searchSoulsToolSurface = {
	name: searchSoulsToolName,
	description:
		'Search shards by content using full-text search, or list pending shards with optional filters.',
	whenToUse:
		'Use this to find specific observations by content (with query) or to browse pending shards (without query). Filter by soul, tags, or limit as needed.',
	whenNotToUse:
		'Do not use this to view the structured evidence report — use inspect_souls_item with includeEvidence. Do not use this to deposit observations — use observe_soul.',
	sideEffects: 'none',
	readOnly: true,
	inputSchema: objectSchema(
		{
			status: enumSchema(
				['pending', 'sealed', 'faded', 'all'],
				'Filter status; defaults to pending for list and all for search.',
			),
			offset: integerSchema('Skip this many results.'),
			query: stringSchema('FTS5 search query. Omit to list pending shards.'),
			soulId: soulReferenceSchema('Filter by soul ID.'),
			tags: stringArraySchema('Filter by all supplied topic tags.'),
			limit: integerSchema('Maximum results.'),
		},
		[],
		'Search or list shards.',
	),
	handler: searchSoulsToolHandler,
} satisfies ToolSurfaceDefinition<
	Parameters<typeof searchSoulsToolHandler>[1],
	SearchSoulsToolData
>;

export const searchSoulsTool = /* @__PURE__ */ defineSoulsTool<
	Parameters<typeof searchSoulsToolHandler>[1],
	SearchSoulsToolData
>({
	...searchSoulsToolSurface,
	supportsClarification: false,
	targetKinds: ['shard'],
	inputDescriptions: {
		query: 'FTS5 search query. Omit to list pending shards by recency.',
		soulId: 'Filter shards attributed to this soul.',
		tags: 'Filter shards by all supplied topic tags.',
		limit: 'Maximum results to return (default 100, maximum 1000).',
	},
	outputDescription: 'Matching or listed shards with count.',
});
