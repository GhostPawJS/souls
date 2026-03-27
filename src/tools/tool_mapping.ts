import {
	inspectSoulsItemToolName,
	levelUpSoulToolName,
	manageSoulToolName,
	observeSoulToolName,
	refineSoulToolName,
	reviewSoulsToolName,
	searchSoulsToolName,
} from './tool_names.ts';

export interface SoulsToolMapping {
	source: string;
	tool: string;
	action?: string | undefined;
}

export const soulsToolMappings: readonly SoulsToolMapping[] = [
	{ source: 'dropShard', tool: observeSoulToolName, action: 'drop' },
	{ source: 'dropShards', tool: observeSoulToolName, action: 'drop_batch' },
	{ source: 'revealShards', tool: observeSoulToolName, action: 'reveal' },
	{ source: 'searchShards', tool: searchSoulsToolName },
	{ source: 'listShards', tool: searchSoulsToolName },
	{ source: 'listSouls', tool: reviewSoulsToolName, action: 'list' },
	{ source: 'runMaintenance', tool: reviewSoulsToolName, action: 'maintenance' },
	{ source: 'crystallizationReadiness', tool: reviewSoulsToolName, action: 'readiness' },
	{ source: 'getSoulProfile', tool: inspectSoulsItemToolName },
	{ source: 'renderSoul', tool: inspectSoulsItemToolName },
	{ source: 'formatEvidence', tool: inspectSoulsItemToolName, action: 'evidence' },
	{ source: 'addTrait', tool: refineSoulToolName, action: 'add_trait' },
	{ source: 'reviseTrait', tool: refineSoulToolName, action: 'revise_trait' },
	{ source: 'revertTrait', tool: refineSoulToolName, action: 'revert_trait' },
	{ source: 'reactivateTrait', tool: refineSoulToolName, action: 'reactivate_trait' },
	{ source: 'citeShard', tool: refineSoulToolName, action: 'cite_shard' },
	{ source: 'stampAttuned', tool: refineSoulToolName, action: 'stamp_attuned' },
	{ source: 'levelUp', tool: levelUpSoulToolName, action: 'execute' },
	{ source: 'revertLevelUp', tool: levelUpSoulToolName, action: 'revert' },
	{ source: 'validateLevelUpPlan', tool: levelUpSoulToolName, action: 'validate' },
	{ source: 'createSoul', tool: manageSoulToolName, action: 'create' },
	{ source: 'updateSoul', tool: manageSoulToolName, action: 'update' },
	{ source: 'retireSoul', tool: manageSoulToolName, action: 'retire' },
	{ source: 'awakenSoul', tool: manageSoulToolName, action: 'awaken' },
];
