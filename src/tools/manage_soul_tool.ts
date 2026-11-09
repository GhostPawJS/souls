import { getSoulsConfig, setSoulsConfig } from '../config.ts';
import type { SoulsDb } from '../database.ts';
import type { SoulRecord } from '../souls/types.ts';
import * as write from '../write.ts';
import { resolveToolSoulReferences } from './resolve_tool_soul_references.ts';
import { translateToolError } from './tool_errors.ts';
import {
	booleanSchema,
	defineSoulsTool,
	enumSchema,
	integerArraySchema,
	numberSchema,
	objectSchema,
	soulReferenceSchema,
	stringSchema,
	integerSchema as thresholdIntegerSchema,
} from './tool_metadata.ts';
import { manageSoulToolName } from './tool_names.ts';
import { inspectSoulsItemNext } from './tool_next.ts';
import { toSoulRef } from './tool_ref.ts';
import type { ToolResult } from './tool_types.ts';
import { toolSuccess } from './tool_types.ts';
import { validateToolInput } from './validate_tool_input.ts';

export interface ManageSoulToolData {
	warnings?: string[] | undefined;
	soul: SoulRecord;
}

export type ManageSoulToolResult = ToolResult<ManageSoulToolData>;
export interface ManageConfigData {
	config: Record<string, string>;
}
type ManageResult = ToolResult<ManageSoulToolData | ManageConfigData>;

export interface ManageSoulInput {
	action: 'create' | 'update' | 'retire' | 'awaken' | 'config_set' | 'config_get' | 'config_list';
	externalId?: string | undefined;
	key?: string | undefined;
	value?: string | undefined;
	name?: string | undefined;
	slug?: string | undefined;
	minSourceDiversity?: number | undefined;
	minSpreadDays?: number | undefined;
	strict?: boolean | undefined;
	operator?: string | undefined;
	reason?: string | undefined;
	shardIds?: number[] | undefined;
	essence?: string | undefined;
	description?: string | undefined;
	soulId?: number | string | undefined;
}
export function manageSoulToolHandler(
	db: SoulsDb,
	input: ManageSoulInput & { action: 'create' | 'update' | 'retire' | 'awaken' },
): ManageSoulToolResult;
export function manageSoulToolHandler(db: SoulsDb, input: ManageSoulInput): ManageResult;
export function manageSoulToolHandler(db: SoulsDb, rawInput: ManageSoulInput): ManageResult {
	const invalid = validateToolInput(manageSoulTool, rawInput);
	if (invalid) return invalid;
	try {
		const input = resolveToolSoulReferences(db, rawInput);
		if (input.action.startsWith('config_')) {
			if (input.action === 'config_set') setSoulsConfig(db, input.key ?? '', input.value ?? '');
			const all = getSoulsConfig(db);
			const config = input.key
				? { [input.key]: all[input.key] ?? (input.key === 'strict' ? 'false' : '') }
				: all;
			return toolSuccess('Configuration.', { config });
		}
		if (input.action === 'create') {
			if (!input.name || !input.essence || !input.description) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'name, essence, and description are required to create a soul.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide name, essence, and description.',
						missing: ['name', 'essence', 'description'].filter(
							(f) => !input[f as keyof typeof input],
						),
					},
				};
			}
			const soul = write.createSoul(db, {
				...(input.externalId === undefined ? {} : { externalId: input.externalId }),
				name: input.name,
				...(input.slug === undefined ? {} : { slug: input.slug }),
				essence: input.essence,
				description: input.description,
			});
			return toolSuccess(
				`Soul "${soul.name}" created (ID: ${soul.id}).`,
				{ soul, ...(soul.warnings?.length ? { warnings: soul.warnings } : {}) },
				{
					entities: [toSoulRef(soul)],
					next: [inspectSoulsItemNext(soul.id, soul.name)],
				},
			);
		}

		if (input.action === 'update') {
			if (!input.soulId) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'soulId is required for update.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide a soulId.',
						missing: ['soulId'],
					},
				};
			}
			const soul = write.updateSoul(db, input.soulId, {
				strict: input.strict,
				operator: input.operator,
				reason: input.reason,
				shardIds: input.shardIds,
				minSourceDiversity: input.minSourceDiversity,
				minSpreadDays: input.minSpreadDays,
				...(input.externalId === undefined ? {} : { externalId: input.externalId }),
				name: input.name,
				...(input.slug === undefined ? {} : { slug: input.slug }),
				essence: input.essence,
				description: input.description,
			});
			return toolSuccess(
				`Soul ${input.soulId} updated.`,
				{ soul, ...(soul.warnings?.length ? { warnings: soul.warnings } : {}) },
				{
					entities: [toSoulRef(soul)],
				},
			);
		}

		if (input.action === 'retire') {
			if (!input.soulId) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'soulId is required for retire.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide a soulId.',
						missing: ['soulId'],
					},
				};
			}
			const soul = write.retireSoul(db, input.soulId);
			return toolSuccess(
				`Soul ${input.soulId} retired.`,
				{ soul, ...(soul.warnings?.length ? { warnings: soul.warnings } : {}) },
				{
					entities: [toSoulRef(soul)],
				},
			);
		}

		if (input.action === 'awaken') {
			if (!input.soulId) {
				return {
					ok: false,
					outcome: 'needs_clarification',
					summary: 'soulId is required for awaken.',
					entities: [],
					clarification: {
						code: 'missing_required_choice',
						question: 'Provide a soulId.',
						missing: ['soulId'],
					},
				};
			}
			const soul = write.awakenSoul(db, input.soulId);
			return toolSuccess(
				`Soul ${input.soulId} awakened.`,
				{ soul, ...(soul.warnings?.length ? { warnings: soul.warnings } : {}) },
				{
					entities: [toSoulRef(soul)],
					next: [inspectSoulsItemNext(input.soulId, soul.name)],
				},
			);
		}

		return translateToolError(new Error(`Unknown action: ${String(input.action)}`), {
			summary: 'Invalid action for manage_soul.',
		});
	} catch (error) {
		return translateToolError(error, { summary: 'Could not manage soul.' });
	}
}

export const manageSoulTool = defineSoulsTool<
	Parameters<typeof manageSoulToolHandler>[1],
	ManageSoulToolData | ManageConfigData
>({
	name: manageSoulToolName,
	description: 'Create, update, retire, or awaken a soul; read or set database configuration.',
	whenToUse:
		'Use create to bootstrap a new soul with an initial essence. Use update to change the name, essence, or description without incrementing the level. Use retire to mark a soul as dormant. Use awaken to restore a dormant soul.',
	whenNotToUse:
		'Do not use update to restructure identity — use level_up_soul. Do not use this to make trait changes — use refine_soul.',
	sideEffects: 'writes_state',
	readOnly: false,
	supportsClarification: true,
	targetKinds: ['soul'],
	inputDescriptions: {
		action: 'create, update, retire, or awaken.',
		name: 'Soul name (required for create; optional for update).',
		essence: 'Soul essence narrative (required for create; optional for update).',
		description: 'Soul description (required for create; optional for update).',
		soulId: 'Soul ID (required for update, retire, awaken).',
	},
	outputDescription: 'The created or modified soul record.',
	inputSchema: objectSchema(
		{
			action: enumSchema(
				['create', 'update', 'retire', 'awaken', 'config_set', 'config_get', 'config_list'],
				'The operation to perform.',
			),
			externalId: stringSchema('Unique external identity binding.'),
			key: stringSchema('Configuration key (strict).'),
			value: stringSchema('Configuration value: true or false.'),
			strict: booleanSchema('Enforce readiness and evidence checks for essence changes.'),
			operator: stringSchema('Named operator correction.'),
			reason: stringSchema('Reason for the change.'),
			shardIds: integerArraySchema('Supporting shard IDs.'),
			slug: stringSchema('Stable soul slug.'),
			name: stringSchema('Soul name.'),
			essence: stringSchema('Soul essence narrative.'),
			description: stringSchema('Soul description.'),
			minSourceDiversity: thresholdIntegerSchema('Minimum source diversity (default 2).'),
			minSpreadDays: numberSchema('Minimum occurrence spread in days (default 1).'),
			soulId: soulReferenceSchema('Soul ID.'),
		},
		['action'],
		'Create or manage a soul lifecycle.',
	),
	handler: manageSoulToolHandler,
});
