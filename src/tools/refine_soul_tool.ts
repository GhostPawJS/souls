import type { SoulsDb } from '../database.ts';
import * as read from '../read.ts';
import type { TraitRecord } from '../traits/types.ts';
import * as write from '../write.ts';
import { translateToolError } from './tool_errors.ts';
import {
	defineSoulsTool,
	enumSchema,
	integerSchema,
	objectSchema,
	stringSchema,
} from './tool_metadata.ts';
import { refineSoulToolName } from './tool_names.ts';
import { inspectSoulsItemNext } from './tool_next.ts';
import { toSoulIdRef, toTraitRef } from './tool_ref.ts';
import type { ToolResult } from './tool_types.ts';
import { toolSuccess, toolWarning } from './tool_types.ts';

export interface RefineSoulToolData {
	trait?: TraitRecord | undefined;
	traitId?: number | undefined;
	soulId?: number | undefined;
}

export type RefineSoulToolResult = ToolResult<RefineSoulToolData>;

export function refineSoulToolHandler(
	db: SoulsDb,
	input: {
		action:
			| 'add_trait'
			| 'revise_trait'
			| 'revert_trait'
			| 'reactivate_trait'
			| 'cite_shard'
			| 'stamp_attuned';
		soulId?: number | undefined;
		traitId?: number | undefined;
		principle?: string | undefined;
		provenance?: string | undefined;
		shardId?: number | undefined;
	},
): RefineSoulToolResult {
	try {
		if (input.action === 'add_trait') {
			if (!input.soulId || !input.principle || !input.provenance) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'soulId, principle, and provenance are required for add_trait.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide soulId, principle, and provenance.',
						missing: ['soulId', 'principle', 'provenance'].filter(
							(f) => !input[f as keyof typeof input],
						),
					},
				};
			}
			const trait = write.addTrait(db, input.soulId, {
				principle: input.principle,
				provenance: input.provenance,
			});
			const traitLimit = read.getTraitLimit();
			const activeCount = read.countActiveTraits(db, input.soulId);
			const warnings =
				activeCount >= traitLimit
					? [
							toolWarning(
								'capacity_warning',
								`Soul now at capacity (${activeCount}/${traitLimit}).`,
							),
						]
					: undefined;
			return toolSuccess(
				`Trait added to soul ${input.soulId}: "${trait.principle}"`,
				{ trait },
				{
					entities: [toSoulIdRef(input.soulId), toTraitRef(trait)],
					next: [inspectSoulsItemNext(input.soulId)],
					warnings,
				},
			);
		}

		if (input.action === 'revise_trait') {
			if (!input.traitId) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'traitId is required for revise_trait.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide a traitId.',
						missing: ['traitId'],
					},
				};
			}
			const trait = write.reviseTrait(db, input.traitId, {
				principle: input.principle,
				provenance: input.provenance,
			});
			return toolSuccess(
				`Trait ${input.traitId} revised.`,
				{ trait },
				{
					entities: [toTraitRef(trait)],
				},
			);
		}

		if (input.action === 'revert_trait') {
			if (!input.traitId) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'traitId is required for revert_trait.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide a traitId.',
						missing: ['traitId'],
					},
				};
			}
			const trait = write.revertTrait(db, input.traitId);
			return toolSuccess(
				`Trait ${input.traitId} reverted.`,
				{ trait },
				{
					entities: [toTraitRef(trait)],
				},
			);
		}

		if (input.action === 'reactivate_trait') {
			if (!input.traitId) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'traitId is required for reactivate_trait.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide a traitId.',
						missing: ['traitId'],
					},
				};
			}
			const trait = write.reactivateTrait(db, input.traitId);
			return toolSuccess(
				`Trait ${input.traitId} reactivated.`,
				{ trait },
				{
					entities: [toTraitRef(trait)],
				},
			);
		}

		if (input.action === 'cite_shard') {
			if (!input.shardId || !input.traitId) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'shardId and traitId are required for cite_shard.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide shardId and traitId.',
						missing: ['shardId', 'traitId'].filter((f) => !input[f as keyof typeof input]),
					},
				};
			}
			write.citeShard(db, input.shardId, input.traitId);
			return toolSuccess(`Shard ${input.shardId} cited for trait ${input.traitId}.`, {
				traitId: input.traitId,
			});
		}

		if (input.action === 'stamp_attuned') {
			if (!input.soulId) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'soulId is required for stamp_attuned.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide a soulId.',
						missing: ['soulId'],
					},
				};
			}
			write.stampAttuned(db, input.soulId);
			return toolSuccess(`Attunement timestamp stamped for soul ${input.soulId}.`, {
				soulId: input.soulId,
			});
		}

		return translateToolError(new Error(`Unknown action: ${String(input.action)}`), {
			summary: 'Invalid action for refine_soul.',
		});
	} catch (error) {
		return translateToolError(error, { summary: 'Could not refine soul.' });
	}
}

export const refineSoulTool = defineSoulsTool<
	Parameters<typeof refineSoulToolHandler>[1],
	RefineSoulToolData
>({
	name: refineSoulToolName,
	description:
		'Add, revise, revert, or reactivate traits; cite shards to traits; stamp attunement.',
	whenToUse:
		'Use after inspecting the evidence report (inspect_souls_item with includeEvidence) to make targeted identity mutations: add a new trait from a novel cluster, revise a stale trait, revert a trait that is causing regression, cite shards to earn provenance, stamp attuned after completing a refinement pass.',
	whenNotToUse:
		'Do not use this for consolidation and essence rewriting — use level_up_soul. Do not use this to deposit observations — use observe_soul.',
	sideEffects: 'writes_state',
	readOnly: false,
	supportsClarification: true,
	targetKinds: ['soul', 'trait', 'shard'],
	inputDescriptions: {
		action:
			'add_trait, revise_trait, revert_trait, reactivate_trait, cite_shard, or stamp_attuned.',
		soulId: 'Required for add_trait, stamp_attuned.',
		traitId: 'Required for revise_trait, revert_trait, reactivate_trait, cite_shard.',
		principle: 'The cognitive rule (for add_trait, revise_trait).',
		provenance: 'Evidence chain justifying the trait (for add_trait, revise_trait).',
		shardId: 'Shard to link (for cite_shard).',
	},
	outputDescription: 'The affected trait record, or a confirmation for cite_shard/stamp_attuned.',
	inputSchema: objectSchema(
		{
			action: enumSchema(
				[
					'add_trait',
					'revise_trait',
					'revert_trait',
					'reactivate_trait',
					'cite_shard',
					'stamp_attuned',
				],
				'The refinement action to perform.',
			),
			soulId: integerSchema('Soul ID (required for add_trait, stamp_attuned).'),
			traitId: integerSchema(
				'Trait ID (required for revise_trait, revert_trait, reactivate_trait, cite_shard).',
			),
			principle: stringSchema('The cognitive rule text.'),
			provenance: stringSchema('Evidence chain justifying the trait.'),
			shardId: integerSchema('Shard ID to link (for cite_shard).'),
		},
		['action'],
		'Make a targeted refinement mutation to a soul.',
	),
	handler: refineSoulToolHandler,
});
