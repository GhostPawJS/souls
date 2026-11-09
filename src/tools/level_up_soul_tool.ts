import type { SoulsDb } from '../database.ts';
import type { LevelUpPlan, LevelUpResult } from '../levels/types.ts';
import type { ValidationFailure, ValidationResult } from '../levels/validate_level_up_plan.ts';
import * as read from '../read.ts';
import * as write from '../write.ts';
import { resolveToolSoulReferences } from './resolve_tool_soul_references.ts';
import { translateToolError } from './tool_errors.ts';
import {
	arraySchema,
	booleanSchema,
	defineSoulsTool,
	enumSchema,
	integerArraySchema,
	integerSchema,
	numberSchema,
	objectSchema,
	soulReferenceSchema,
	stringSchema,
} from './tool_metadata.ts';
import { levelUpSoulToolName } from './tool_names.ts';
import { inspectSoulsItemNext } from './tool_next.ts';
import { toSoulIdRef } from './tool_ref.ts';
import type { ToolResult } from './tool_types.ts';
import { toolSuccess } from './tool_types.ts';
import { validateToolInput } from './validate_tool_input.ts';

export interface LevelUpSoulExecuteData {
	warnings?: string[];
	result: LevelUpResult;
	soulId: number;
}

export interface LevelUpSoulRevertData {
	warnings?: string[];
	soulId: number;
}

export type LevelUpValidationData = ValidationResult | ValidationFailure;

export interface LevelUpReadinessData {
	warnings?: string[];
	ready: boolean;
	blockers: string[];
	profile: ReturnType<typeof read.getSoulProfile>;
}

export type LevelUpSoulToolData =
	| LevelUpSoulExecuteData
	| LevelUpSoulRevertData
	| LevelUpValidationData
	| LevelUpReadinessData;

export type LevelUpSoulToolResult = ToolResult<LevelUpSoulToolData>;

export function levelUpSoulToolHandler(
	db: SoulsDb,
	rawInput: {
		minSourceDiversity?: number | undefined;
		minSpreadDays?: number | undefined;
		action: 'execute' | 'revert' | 'validate';
		soulId: number | string;
		strict?: boolean | undefined;
		traitLimit?: number | undefined;
		plan?: LevelUpPlan | undefined;
	},
): LevelUpSoulToolResult {
	const invalid = validateToolInput(levelUpSoulTool, rawInput);
	if (invalid) return invalid;
	try {
		const input = resolveToolSoulReferences(db, rawInput);
		if (input.action === 'validate') {
			if (!input.plan) {
				const profile = read.getSoulProfile(db, input.soulId, input);
				const blockers: string[] = [];
				if (!profile.crystallizationReady)
					blockers.push(
						profile.readinessReason ??
							'Soul is not crystallization-ready: check pending count, source diversity, occurrence spread, recency and cluster diversity.',
					);
				if (!profile.atCapacity)
					blockers.push(
						`Soul has ${profile.activeTraitCount}/${profile.traitLimit} active traits; consolidation is normally performed near capacity.`,
					);
				return toolSuccess(
					blockers.length
						? `Level-up readiness: ${blockers.join(' ')}`
						: 'Soul is ready for a level-up plan.',
					{ ready: blockers.length === 0, blockers, profile },
					{ entities: [toSoulIdRef(input.soulId)] },
				);
			}
			const validation = read.validateLevelUpPlan(db, input.soulId, input.plan, {
				...(input.strict === undefined ? {} : { strict: input.strict }),
				...(input.traitLimit === undefined ? {} : { traitLimit: input.traitLimit }),
			});
			return toolSuccess(
				validation.valid ? 'Level-up plan is valid.' : 'Level-up plan has errors — see data.',
				validation,
				{ entities: [toSoulIdRef(input.soulId)] },
			);
		}

		if (input.action === 'execute') {
			if (!input.plan) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'plan is required for execute.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide a LevelUpPlan. Validate it first.',
						missing: ['plan'],
					},
				};
			}
			const result = write.levelUp(db, input.soulId, input.plan, {
				...(input.strict === undefined ? {} : { strict: input.strict }),
				...(input.traitLimit === undefined ? {} : { traitLimit: input.traitLimit }),
			});
			const data: LevelUpSoulExecuteData = {
				result,
				soulId: input.soulId,
				...(result.warnings?.length ? { warnings: result.warnings } : {}),
			};
			return toolSuccess(`Soul ${input.soulId} leveled up to level ${result.level}.`, data, {
				entities: [toSoulIdRef(input.soulId)],
				next: [inspectSoulsItemNext(input.soulId)],
			});
		}

		if (input.action === 'revert') {
			const warnings: string[] = [];
			write.revertLevelUp(db, input.soulId, { onWarning: (warning) => warnings.push(warning) });
			return toolSuccess(
				`Level-up reverted for soul ${input.soulId}.`,
				{ soulId: input.soulId, ...(warnings.length ? { warnings } : {}) },
				{
					entities: [toSoulIdRef(input.soulId)],
					next: [inspectSoulsItemNext(input.soulId)],
				},
			);
		}

		return translateToolError(new Error(`Unknown action: ${String(input.action)}`), {
			summary: 'Invalid action for level_up_soul.',
		});
	} catch (error) {
		return translateToolError(error, { summary: 'Could not perform level-up operation.' });
	}
}

export const levelUpSoulTool = defineSoulsTool<
	Parameters<typeof levelUpSoulToolHandler>[1],
	LevelUpSoulToolData
>({
	name: levelUpSoulToolName,
	description:
		'Validate, execute, or revert a level-up plan for a soul — consolidating traits, promoting knowledge into essence, and incrementing the generation.',
	whenToUse:
		'Use validate without a plan to check readiness and blockers, or with a plan to check it before executing it. Use execute when the plan is validated and the soul is ready for restructuring. Use revert to undo the last level-up if the outcome was wrong.',
	whenNotToUse:
		'Do not use this for targeted trait mutations — use refine_soul. Do not use this unless the soul is at or near trait capacity and crystallization is ready.',
	sideEffects: 'writes_state',
	readOnly: false,
	supportsClarification: true,
	targetKinds: ['soul'],
	inputDescriptions: {
		action:
			'validate: check plan completeness, execute: apply the plan, revert: undo last level-up.',
		soulId: 'The soul to level up.',
		plan: 'The level-up plan (required for execute; omit for a readiness and blockers check with validate).',
	},
	outputDescription: 'Validation result, level-up result with snapshot, or revert confirmation.',
	inputSchema: objectSchema(
		{
			action: enumSchema(['validate', 'execute', 'revert'], 'The operation to perform.'),
			minSourceDiversity: integerSchema(
				'Minimum source diversity for planless readiness (default 2).',
			),
			minSpreadDays: numberSchema(
				'Minimum occurrence spread in days for planless readiness (default 1).',
			),
			traitLimit: integerSchema('Override active trait capacity.'),
			strict: booleanSchema('Reject new validation errors instead of warning.'),
			soulId: soulReferenceSchema('The soul ID.'),
			plan: objectSchema(
				{
					newEssence: stringSchema('The new essence narrative after level-up.'),
					consolidations: arraySchema(
						objectSchema(
							{
								sourceTraitIds: integerArraySchema('Trait IDs to merge.'),
								mergedPrinciple: stringSchema('The merged principle.'),
								mergedProvenance: stringSchema('The merged provenance.'),
							},
							['sourceTraitIds', 'mergedPrinciple', 'mergedProvenance'],
						),
						'Consolidation groups.',
					),
					promotedTraitIds: integerArraySchema('Trait IDs to absorb into essence.'),
					carriedTraitIds: integerArraySchema('Trait IDs to carry unchanged.'),
				},
				['newEssence', 'consolidations', 'promotedTraitIds', 'carriedTraitIds'],
				'The level-up plan; omit with validate to report readiness and blockers.',
			),
		},
		['action', 'soulId'],
		'Execute or validate a soul level-up.',
	),
	handler: levelUpSoulToolHandler,
});
