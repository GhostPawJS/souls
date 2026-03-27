import type { SoulsDb } from '../database.ts';
import * as read from '../read.ts';
import type { EvidenceReport } from '../shards/types.ts';
import type { SoulProfile } from '../souls/get_soul_profile.ts';
import { translateToolError } from './tool_errors.ts';
import { booleanSchema, defineSoulsTool, integerSchema, objectSchema } from './tool_metadata.ts';
import { inspectSoulsItemToolName } from './tool_names.ts';
import { refineSoulNext, searchSoulsNext } from './tool_next.ts';
import { toSoulRef } from './tool_ref.ts';
import type { ToolResult } from './tool_types.ts';
import { toolSuccess, toolWarning } from './tool_types.ts';

export interface InspectSoulsItemToolData {
	profile: SoulProfile;
	renderedIdentity: string;
	evidence?: EvidenceReport | undefined;
}

export type InspectSoulsItemToolResult = ToolResult<InspectSoulsItemToolData>;

export function inspectSoulsItemToolHandler(
	db: SoulsDb,
	input: {
		soulId: number;
		includeEvidence?: boolean | undefined;
		includeProvenance?: boolean | undefined;
	},
): InspectSoulsItemToolResult {
	try {
		const profile = read.getSoulProfile(db, input.soulId);
		const renderedIdentity = read.renderSoul(db, input.soulId, {
			includeProvenance: input.includeProvenance ?? false,
		});

		const data: InspectSoulsItemToolData = { profile, renderedIdentity };

		if (input.includeEvidence) {
			data.evidence = read.formatEvidence(db, input.soulId);
		}

		const warnings = [];
		if (profile.atCapacity) {
			warnings.push(
				toolWarning(
					'capacity_warning',
					`Soul is at trait capacity (${profile.activeTraitCount}/${profile.traitLimit}) — level-up recommended.`,
				),
			);
		}

		const next = [
			searchSoulsNext(undefined, input.soulId),
			refineSoulNext('add_trait', input.soulId, 'Add a trait based on evidence.'),
		];

		return toolSuccess(
			`Soul "${profile.soul.name}" — level ${profile.soul.level}, ${profile.activeTraitCount}/${profile.traitLimit} traits, ${profile.pendingShardCount} pending shards.`,
			data,
			{
				entities: [toSoulRef(profile.soul)],
				next,
				warnings: warnings.length > 0 ? warnings : undefined,
			},
		);
	} catch (error) {
		return translateToolError(error, { summary: 'Could not inspect soul.' });
	}
}

export const inspectSoulsItemTool = defineSoulsTool<
	Parameters<typeof inspectSoulsItemToolHandler>[1],
	InspectSoulsItemToolData
>({
	name: inspectSoulsItemToolName,
	description:
		'Get the full profile, rendered identity block, and optionally the evidence report for a single soul.',
	whenToUse:
		'Use this when you need the complete current state of a soul — traits, capacity, health, rendered identity — before deciding on a refinement action. Add includeEvidence when you need the clustered evidence report with signals and suggested actions.',
	whenNotToUse:
		'Do not use this to search across shards — use search_souls. Do not use this to make changes — use refine_soul, level_up_soul, or manage_soul.',
	sideEffects: 'none',
	readOnly: true,
	supportsClarification: false,
	targetKinds: ['soul'],
	inputDescriptions: {
		soulId: 'The soul to inspect.',
		includeEvidence:
			'If true, include the full evidence report (clusters, signals, suggested actions). Default: false.',
		includeProvenance:
			'If true, include trait provenance in the rendered identity block (full mode). Default: false (lean mode for system prompts).',
	},
	outputDescription:
		'Soul profile with traits and health, rendered identity block markdown, and optionally the evidence report.',
	inputSchema: objectSchema(
		{
			soulId: integerSchema('The soul ID to inspect.'),
			includeEvidence: booleanSchema(
				'Include evidence report with clusters and signals. Default false.',
			),
			includeProvenance: booleanSchema('Include provenance in rendered identity. Default false.'),
		},
		['soulId'],
		'Inspect a soul in full detail.',
	),
	handler: inspectSoulsItemToolHandler,
});
