import type { SoulsDb } from '../database.ts';
import type { SoulRecord } from '../souls/types.ts';
import * as write from '../write.ts';
import { translateToolError } from './tool_errors.ts';
import {
	defineSoulsTool,
	enumSchema,
	integerSchema,
	objectSchema,
	stringSchema,
} from './tool_metadata.ts';
import { manageSoulToolName } from './tool_names.ts';
import { inspectSoulsItemNext } from './tool_next.ts';
import { toSoulRef } from './tool_ref.ts';
import type { ToolResult } from './tool_types.ts';
import { toolSuccess } from './tool_types.ts';

export interface ManageSoulToolData {
	soul: SoulRecord;
}

export type ManageSoulToolResult = ToolResult<ManageSoulToolData>;

export function manageSoulToolHandler(
	db: SoulsDb,
	input: {
		action: 'create' | 'update' | 'retire' | 'awaken';
		name?: string | undefined;
		essence?: string | undefined;
		description?: string | undefined;
		soulId?: number | undefined;
	},
): ManageSoulToolResult {
	try {
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
				name: input.name,
				essence: input.essence,
				description: input.description,
			});
			return toolSuccess(
				`Soul "${soul.name}" created (ID: ${soul.id}).`,
				{ soul },
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
				name: input.name,
				essence: input.essence,
				description: input.description,
			});
			return toolSuccess(
				`Soul ${input.soulId} updated.`,
				{ soul },
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
				{ soul },
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
				{ soul },
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
	ManageSoulToolData
>({
	name: manageSoulToolName,
	description: 'Create, update, retire, or awaken a soul.',
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
			action: enumSchema(['create', 'update', 'retire', 'awaken'], 'The operation to perform.'),
			name: stringSchema('Soul name.'),
			essence: stringSchema('Soul essence narrative.'),
			description: stringSchema('Soul description.'),
			soulId: integerSchema('Soul ID.'),
		},
		['action'],
		'Create or manage a soul lifecycle.',
	),
	handler: manageSoulToolHandler,
});
