import type { SoulsDb } from '../database.ts';
import type { LevelUpPlan, LevelUpResult } from '../levels/types.ts';
import type { ValidationFailure, ValidationResult } from '../levels/validate_level_up_plan.ts';
import * as read from '../read.ts';
import * as write from '../write.ts';
import { translateToolError } from './tool_errors.ts';
import {
	arraySchema,
	defineSoulsTool,
	enumSchema,
	integerArraySchema,
	integerSchema,
	objectSchema,
	stringSchema,
} from './tool_metadata.ts';
import { levelUpSoulToolName } from './tool_names.ts';
import { inspectSoulsItemNext } from './tool_next.ts';
import { toSoulIdRef } from './tool_ref.ts';
import type { ToolResult } from './tool_types.ts';
import { toolSuccess } from './tool_types.ts';

export interface LevelUpSoulExecuteData {
	result: LevelUpResult;
	soulId: number;
}

export interface LevelUpSoulRevertData {
	soulId: number;
}

export type LevelUpValidationData = ValidationResult | ValidationFailure;

export type LevelUpSoulToolData =
	| LevelUpSoulExecuteData
	| LevelUpSoulRevertData
	| LevelUpValidationData;

export type LevelUpSoulToolResult = ToolResult<LevelUpSoulToolData>;

export function levelUpSoulToolHandler(
	db: SoulsDb,
	input: {
		action: 'execute' | 'revert' | 'validate';
		soulId: number;
		plan?: LevelUpPlan | undefined;
	},
): LevelUpSoulToolResult {
	try {
		if (input.action === 'validate') {
			if (!input.plan) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'plan is required for validate.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide a LevelUpPlan to validate.',
						missing: ['plan'],
					},
				};
			}
			const validation = read.validateLevelUpPlan(db, input.soulId, input.plan);
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
			const result = write.levelUp(db, input.soulId, input.plan);
			const data: LevelUpSoulExecuteData = { result, soulId: input.soulId };
			return toolSuccess(`Soul ${input.soulId} leveled up to level ${result.level}.`, data, {
				entities: [toSoulIdRef(input.soulId)],
				next: [inspectSoulsItemNext(input.soulId)],
			});
		}

		if (input.action === 'revert') {
			write.revertLevelUp(db, input.soulId);
			return toolSuccess(
				`Level-up reverted for soul ${input.soulId}.`,
				{ soulId: input.soulId },
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
		'Use validate to check a plan before executing it. Use execute when the plan is validated and the soul is ready for restructuring. Use revert to undo the last level-up if the outcome was wrong.',
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
		plan: 'The level-up plan (required for validate and execute).',
	},
	outputDescription: 'Validation result, level-up result with snapshot, or revert confirmation.',
	inputSchema: objectSchema(
		{
			action: enumSchema(['validate', 'execute', 'revert'], 'The operation to perform.'),
			soulId: integerSchema('The soul ID.'),
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
				'The level-up plan.',
			),
		},
		['action', 'soulId'],
		'Execute or validate a soul level-up.',
	),
	handler: levelUpSoulToolHandler,
});
