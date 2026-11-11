import type { SoulsDb } from '../database.ts';
import type { SurfaceTool } from '../surfaces/surface_types.ts';
import { reviewTracesTool } from '../tools/review_traces_tool.ts';
import { soulsTools } from '../tools/tool_registry.ts';
import { traceSoulTool } from '../tools/trace_soul_tool.ts';

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
	trace_soul: {
		noun: 'trace',
		verb: 'record',
		action: {
			property: 'action',
			positionals: {
				record: ['text'],
				roll: ['id'],
				revise: ['id'],
				settle: ['id'],
				link: ['id'],
				unlink: ['id'],
				tag: ['id'],
				untag: ['id'],
				cite: ['shardId', 'id'],
			},
		},
	},
	review_traces: {
		noun: 'trace',
		verb: 'list',
		action: {
			property: 'view',
			positionals: {
				list: [],
				search: ['query'],
				due: [],
				show: ['id'],
				history: ['id'],
				chain: ['id'],
				changed: [],
				stats: [],
			},
		},
	},
	search_souls: { verb: 'search', positionals: ['query'] },
	review_souls: {
		verb: 'review',
		positionals: ['view'],
		helpInputSchema: {
			type: 'object',
			required: ['view'],
			properties: {
				minSourceDiversity: {
					type: 'integer',
					description: 'Minimum source diversity (default 2).',
				},
				minSpreadDays: {
					type: 'number',
					description: 'Minimum occurrence spread in days (default 1).',
				},
				readiness: {
					type: 'string',
					enum: ['converged', 'legacy'],
					description:
						'converged (default): ready needs a cluster of minClusterSize shards from two or more sources; legacy: the 0.5.1 gate.',
				},
				minClusterSize: {
					type: 'integer',
					description: 'Shards a converged cluster needs (default 3).',
				},
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
			positionals: {
				drop: ['content'],
				reveal: ['shardIds'],
				retract: ['id'],
				supersede: ['id'],
				show: ['id'],
				history: ['id'],
			},
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
		...(tool.name === 'observe_soul'
			? {
					inputSchema: {
						...tool.inputSchema,
						properties: {
							...tool.inputSchema.properties,
							traceIds: {
								type: 'array',
								items: { oneOf: [{ type: 'integer' }, { type: 'string' }] },
								description: 'Trace ids, repeated or comma separated.',
							},
						},
					},
				}
			: {}),
		...(tool.name === 'trace_soul'
			? {
					inputSchema: {
						...traceSoulTool.inputSchema,
						type: 'object' as const,
						properties: {
							...traceSoulTool.inputSchema.properties,
							supersedes: {
								type: ['array', 'integer', 'null'],
								items: { oneOf: [{ type: 'string' }, { type: 'integer' }] },
							},
							soul: {
								type: 'array',
								items: { type: 'string' },
								description: 'Linked soul[:owner|counterpart|subject]; repeat for more links.',
							},
							tag: { type: 'array', items: { type: 'string' } },
							due: { type: 'string', description: 'Due date or none.' },
							settled: {
								type: 'string',
								enum: ['done', 'dropped'],
								description: 'Record an already settled trace.',
							},
							weight: { oneOf: [{ type: 'number' }, { type: 'string' }, { type: 'null' }] },
						},
					},
				}
			: {}),
		...(tool.name === 'review_traces'
			? {
					inputSchema: {
						...reviewTracesTool.inputSchema,
						type: 'object' as const,
						properties: {
							...reviewTracesTool.inputSchema.properties,
							soul: { type: 'string' },
							with: { type: 'string' },
							excludeTag: { type: 'array', items: { type: 'string' } },
							tag: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
						},
					},
				}
			: {}),
		...(mapping[tool.name] ? { cli: mapping[tool.name] } : {}),
	}),
);

export { soulsSurfaceTools as soulsMcpSurfaceTools, soulsCliSurfaceTools as soulsSurfaceTools };
