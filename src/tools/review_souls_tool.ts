import type { SoulsDb } from '../database.ts';
import type { MaintenanceResult } from '../maintenance.ts';
import { runMaintenance } from '../maintenance.ts';
import * as read from '../read.ts';
import type { CrystallizationRecord } from '../shards/types.ts';
import type { SoulRecord } from '../souls/types.ts';
import { translateToolError } from './tool_errors.ts';
import { defineSoulsTool, enumSchema, objectSchema } from './tool_metadata.ts';
import { reviewSoulsToolName } from './tool_names.ts';
import { inspectSoulsItemNext } from './tool_next.ts';
import { toSoulRef } from './tool_ref.ts';
import { summarizeCount } from './tool_summary.ts';
import type { ToolResult } from './tool_types.ts';
import { toolSuccess, toolWarning } from './tool_types.ts';

export interface ReviewSoulsListData {
	souls: SoulRecord[];
}

export interface ReviewSoulsMaintenanceData {
	maintenance: MaintenanceResult;
}

export interface ReviewSoulsReadinessData {
	readySouls: CrystallizationRecord[];
}

export type ReviewSoulsToolData =
	| ReviewSoulsListData
	| ReviewSoulsMaintenanceData
	| ReviewSoulsReadinessData;

export type ReviewSoulsToolResult = ToolResult<ReviewSoulsToolData>;

export function reviewSoulsToolHandler(
	db: SoulsDb,
	input: { view: 'list' | 'maintenance' | 'readiness' },
): ReviewSoulsToolResult {
	try {
		if (input.view === 'list') {
			const souls = read.listSouls(db);
			const data: ReviewSoulsListData = { souls };
			return toolSuccess(`${summarizeCount(souls.length, 'active soul')}.`, data, {
				entities: souls.map(toSoulRef),
			});
		}

		if (input.view === 'maintenance') {
			const maintenance = runMaintenance(db);
			const data: ReviewSoulsMaintenanceData = { maintenance };
			const next = maintenance.readySouls.slice(0, 3).map((r) => inspectSoulsItemNext(r.soulId));
			const warnings =
				maintenance.readySouls.length > 0
					? [
							toolWarning(
								'partial_match',
								`${summarizeCount(maintenance.readySouls.length, 'soul')} ready for refinement.`,
							),
						]
					: undefined;
			return toolSuccess(
				`Maintenance complete: ${maintenance.fadedShardCount} shards faded, ${summarizeCount(maintenance.readySouls.length, 'soul')} ready for refinement.`,
				data,
				{ next, warnings },
			);
		}

		if (input.view === 'readiness') {
			const readySouls = read.crystallizationReadiness(db);
			const data: ReviewSoulsReadinessData = { readySouls };
			const next = readySouls.slice(0, 5).map((r) => inspectSoulsItemNext(r.soulId));
			return toolSuccess(
				`${summarizeCount(readySouls.length, 'soul')} ready for refinement.`,
				data,
				{ next },
			);
		}

		return translateToolError(new Error(`Unknown view: ${String(input.view)}`), {
			summary: 'Invalid view for review_souls.',
		});
	} catch (error) {
		return translateToolError(error, { summary: 'Could not review souls.' });
	}
}

export const reviewSoulsTool = defineSoulsTool<
	Parameters<typeof reviewSoulsToolHandler>[1],
	ReviewSoulsToolData
>({
	name: reviewSoulsToolName,
	description:
		'List all active souls, run the maintenance cycle, or check crystallization readiness.',
	whenToUse:
		'Use list to discover active souls. Use maintenance to run the standard maintenance pass (fades exhausted shards + checks readiness) as part of a regular cycle. Use readiness to check which souls are ready for refinement without running maintenance.',
	whenNotToUse:
		'Do not use this to inspect a specific soul in detail — use inspect_souls_item. Do not use this to search shards — use search_souls.',
	sideEffects: 'writes_state',
	readOnly: false,
	supportsClarification: false,
	targetKinds: ['soul'],
	inputDescriptions: {
		view: 'list: all active souls, maintenance: run fade + readiness cycle, readiness: crystallization status only.',
	},
	outputDescription: 'Depends on view: soul list, maintenance result, or readiness records.',
	inputSchema: objectSchema(
		{
			view: enumSchema(['list', 'maintenance', 'readiness'], 'The operation to perform.'),
		},
		['view'],
		'Review souls or run maintenance.',
	),
	handler: reviewSoulsToolHandler,
});
