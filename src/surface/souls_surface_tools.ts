import type { SoulsDb } from '../database.ts';
import type { SurfaceTool } from '../surfaces/surface_types.ts';
import { soulsTools } from '../tools/tool_registry.ts';

const soulsSurfaceTools: readonly SurfaceTool<SoulsDb>[] = soulsTools.map((tool) => ({
	name: tool.name,
	description: tool.description,
	whenToUse: tool.whenToUse,
	whenNotToUse: tool.whenNotToUse,
	readOnly: tool.readOnly,
	sideEffects: tool.sideEffects,
	inputSchema: { ...tool.inputSchema, type: 'object' },
	handler: tool.handler as SurfaceTool<SoulsDb>['handler'],
}));

const mapping: Record<string, NonNullable<SurfaceTool<SoulsDb>['cli']>> = {
	search_souls: { verb: 'search', positionals: ['query'] },
	review_souls: {
		verb: 'review',
		positionals: ['view'],
		helpInputSchema: {
			type: 'object',
			required: ['view'],
			properties: {
				view: {
					type: 'string',
					enum: ['list', 'maintenance', 'readiness'],
					description:
						'list: all active souls, maintenance: run fade + readiness cycle, readiness: crystallization status only.',
				},
			},
		},
	},
	inspect_souls_item: { noun: 'soul', verb: 'show', positionals: ['soulId'] },
	manage_soul: {
		noun: 'soul',
		verb: 'manage',
		fileArgs: ['essence'],
		action: {
			property: 'action',
			positionals: { create: ['name'], update: ['soulId'], retire: ['soulId'], awaken: ['soulId'] },
		},
	},
	observe_soul: {
		noun: 'shard',
		fileArgs: ['shards'],
		verb: 'observe',
		action: {
			property: 'action',
			verbs: { drop_batch: 'drop-batch' },
			positionals: { drop: ['content'], reveal: ['shardIds'] },
		},
	},
	refine_soul: {
		noun: 'refinement',
		verb: 'refine',
		action: {
			property: 'action',
			verbs: {
				refine_with_evidence: 'apply',
				add_trait: 'add',
				revise_trait: 'revise',
				revert_trait: 'revert',
				reactivate_trait: 'reactivate',
				cite_shard: 'cite',
				stamp_attuned: 'attune',
			},
			positionals: {
				refine_with_evidence: ['soulId'],
				add_trait: ['soulId'],
				revise_trait: ['traitId'],
				revert_trait: ['traitId'],
				reactivate_trait: ['traitId'],
				cite_shard: ['traitId', 'shardId'],
				stamp_attuned: ['soulId'],
			},
		},
	},
	level_up_soul: {
		noun: 'level',
		verb: 'up',
		positionals: ['soulId'],
		action: { property: 'action', verbs: { execute: 'up' } },
	},
};
const soulsCliSurfaceTools: readonly SurfaceTool<SoulsDb>[] = /* @__PURE__ */ soulsSurfaceTools.map(
	(tool) => ({
		...tool,
		...(mapping[tool.name] ? { cli: mapping[tool.name] } : {}),
	}),
);

export { soulsSurfaceTools as soulsMcpSurfaceTools, soulsCliSurfaceTools as soulsSurfaceTools };
