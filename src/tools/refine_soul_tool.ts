import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import * as read from '../read.ts';
import type { TraitRecord } from '../traits/types.ts';
import * as write from '../write.ts';
import { translateToolError } from './tool_errors.ts';
import {
	booleanSchema,
	defineSoulsTool,
	enumSchema,
	integerArraySchema,
	integerSchema,
	objectSchema,
	stringSchema,
} from './tool_metadata.ts';
import { refineSoulToolName } from './tool_names.ts';
import { inspectSoulsItemNext } from './tool_next.ts';
import { toSoulIdRef, toTraitRef } from './tool_ref.ts';
import type { ToolResult } from './tool_types.ts';
import { toolSuccess, toolWarning } from './tool_types.ts';
import { validateToolInput } from './validate_tool_input.ts';

export interface RefineSoulToolData {
	warnings?: string[] | undefined;
	trait?: TraitRecord | undefined;
	traitId?: number | undefined;
	soulId?: number | undefined;
}

export type RefineSoulToolResult = ToolResult<RefineSoulToolData>;

export function refineSoulToolHandler(
	db: SoulsDb,
	input: {
		action:
			| 'refine_with_evidence'
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
		strict?: boolean | undefined;
		operator?: string | undefined;
		reason?: string | undefined;
		shardIds?: number[] | undefined;
		traitLimit?: number | undefined;
		expectedRevision?: number | undefined;
		refineAction?: 'add' | 'revise' | undefined;
		shardId?: number | undefined;
	},
): RefineSoulToolResult {
	const invalid = validateToolInput(refineSoulTool, input);
	if (invalid) return invalid;
	try {
		if (input.action === 'refine_with_evidence') {
			if (!input.soulId || !input.principle || !input.provenance || !input.shardIds)
				throw new SoulsValidationError('soulId, principle, provenance, and shardIds are required.');
			const trait = write.refineWithEvidence(db, {
				...input,
				soulId: input.soulId,
				principle: input.principle,
				provenance: input.provenance,
				shardIds: input.shardIds,
				action: input.refineAction ?? (input.traitId ? 'revise' : 'add'),
			});
			return toolSuccess(
				'Refinement applied.',
				{ trait, ...(trait.warnings?.length ? { warnings: trait.warnings } : {}) },
				{ warnings: trait.warnings?.map((w) => toolWarning('partial_match', w)) },
			);
		}
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
			const trait = write.addTrait(
				db,
				input.soulId,
				{
					principle: input.principle,
					provenance: input.provenance,
					strict: input.strict,
					operator: input.operator,
					reason: input.reason,
					shardIds: input.shardIds,
				},
				input.traitLimit === undefined ? undefined : { traitLimit: input.traitLimit },
			);
			const traitLimit = read.getTraitLimit(
				input.traitLimit === undefined ? undefined : { traitLimit: input.traitLimit },
			);
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
				{ trait, ...(trait.warnings?.length ? { warnings: trait.warnings } : {}) },
				{
					entities: [toSoulIdRef(input.soulId), toTraitRef(trait)],
					next: [inspectSoulsItemNext(input.soulId)],
					warnings: [
						...(warnings ?? []),
						...(trait.warnings ?? []).map((w) => toolWarning('partial_match', w)),
					],
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
				reason: input.reason,
				operator: input.operator,
			});
			return toolSuccess(
				`Trait ${input.traitId} revised.`,
				{ trait, ...(trait.warnings?.length ? { warnings: trait.warnings } : {}) },
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
				{ trait, ...(trait.warnings?.length ? { warnings: trait.warnings } : {}) },
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
			const trait = write.reactivateTrait(db, input.traitId, {
				...(input.strict === undefined ? {} : { strict: input.strict }),
				...(input.traitLimit === undefined ? {} : { traitLimit: input.traitLimit }),
			});
			return toolSuccess(
				`Trait ${input.traitId} reactivated.`,
				{ trait, ...(trait.warnings?.length ? { warnings: trait.warnings } : {}) },
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
		'Add, revise, revert, or reactivate traits; cite evidence; apply atomic refinement with revision conflict checks.',
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
			'add_trait, revise_trait, revert_trait, reactivate_trait, cite_shard, stamp_attuned, or refine_with_evidence. New evidence gates warn by default; strict enforces them; operator records a correction.',
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
					'refine_with_evidence',
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
			strict: booleanSchema('Enforce readiness, evidence, and capacity checks.'),
			operator: stringSchema('Named operator correction; bypasses the strict evidence gate.'),
			reason: stringSchema('Reason for the wording change.'),
			shardIds: integerArraySchema('Supporting shard IDs.'),
			traitLimit: integerSchema('Override active trait capacity.'),
			expectedRevision: integerSchema('Expected latest revision id (0 for none).'),
			refineAction: enumSchema(
				['add', 'revise'],
				'Atomic refinement operation; inferred from traitId when omitted.',
			),
			shardId: integerSchema('Shard ID to link (for cite_shard).'),
		},
		['action'],
		'Make a targeted refinement mutation to a soul.',
	),
	handler: refineSoulToolHandler,
});
