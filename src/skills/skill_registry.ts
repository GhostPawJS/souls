import { bootstrapNewSoulSkill } from './bootstrap-new-soul.ts';
import { detectAndFixRegressionSkill } from './detect-and-fix-regression.ts';
import { executeLevelUpPlanSkill } from './execute-level-up-plan.ts';
import { judgeConsolidationVersusPromotionSkill } from './judge-consolidation-versus-promotion.ts';
import { observeBehaviorWellSkill } from './observe-behavior-well.ts';
import { produceTraitProposalsFromEvidenceSkill } from './produce-trait-proposals-from-evidence.ts';
import { reviewSoulHealthSkill } from './review-soul-health.ts';
import { runMaintenancePassSkill } from './run-maintenance-pass.ts';
import type { SoulsSkillRegistry } from './skill_types.ts';

export const soulsSkills = [
	observeBehaviorWellSkill,
	runMaintenancePassSkill,
	produceTraitProposalsFromEvidenceSkill,
	judgeConsolidationVersusPromotionSkill,
	executeLevelUpPlanSkill,
	bootstrapNewSoulSkill,
	detectAndFixRegressionSkill,
	reviewSoulHealthSkill,
] satisfies SoulsSkillRegistry;

export function getSoulsSkillByName(name: string) {
	return soulsSkills.find((skill) => skill.name === name) ?? null;
}

export function listSoulsSkills() {
	return [...soulsSkills];
}
