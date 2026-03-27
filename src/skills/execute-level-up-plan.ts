import { defineSoulsSkill } from './skill_types.ts';

export const executeLevelUpPlanSkill = defineSoulsSkill({
	name: 'execute-level-up-plan',
	description: 'Validate, execute, and verify a level-up plan for a soul.',
	content: `# Execute Level-Up Plan

Use this after constructing a level-up plan via judge-consolidation-versus-promotion and confirming that crystallization is ready.

## Procedure

1. **Validate the plan.** Use \`level_up_soul\` with action=validate, the soulId, and the plan. Check the returned result: if valid=false, inspect the error (missingTraitIds, duplicateTraitIds, invalidTraitIds) and revise the plan.

2. **Do not proceed if validation fails.** Fix the plan and re-validate. Common issues: (1) a trait appears in multiple lists, (2) an inactive or merged trait ID is referenced, (3) an active trait was not included in any list.

3. **Execute the plan.** Once validated: use \`level_up_soul\` with action=execute, the same soulId and plan. Confirm the result returns the incremented level.

4. **Verify the post-level-up state.** Use \`inspect_souls_item\` to confirm: active trait count should be reduced (consolidated + promoted traits no longer active), soul level should be incremented, essence should match newEssence from the plan.

5. **Stamp attunement.** Use \`refine_soul\` with action=stamp_attuned. This marks the post-level-up baseline for the recency gate in future crystallization checks.

## Notes

If the level-up produces an unexpected result (wrong trait count, wrong essence, regression in behavior), use \`level_up_soul\` with action=revert immediately. The revert operation restores all consolidated traits and the previous essence.`,
});
