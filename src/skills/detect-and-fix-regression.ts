import { defineSoulsSkill } from './skill_types.ts';

export const detectAndFixRegressionSkill = defineSoulsSkill({
	name: 'detect-and-fix-regression',
	description:
		'Spot regression signals in evidence, use revert-trait or revert-level-up to restore identity integrity.',
	content: `# Detect and Fix Regression

Use this when behavioral quality signals drop after a refinement or level-up, or when evidence accumulates indicating a trait is producing harmful behavioral patterns.

## Procedure

1. **Get the evidence report.** Use \`inspect_souls_item\` with includeEvidence=true. Look for: novel clusters that contradict recently added traits, high-citation shards describing failures correlated with the last refinement, detected tensions between new and old traits.

2. **Identify the regression signal.** A regression is when a previously stable behavioral pattern deteriorates after a trait mutation or level-up. Distinguish between: (a) genuine regression caused by the last mutation, (b) newly observed pre-existing failure that was previously unobserved, (c) evidence from a biased source that does not represent overall behavior.

3. **Decide the intervention.** If the regression is caused by the last level-up: revert the level-up using \`level_up_soul\` with action=revert. This restores the previous essence and reactivates consolidated traits. If the regression is caused by a specific trait: revert that trait using \`refine_soul\` with action=revert_trait.

4. **Apply the chosen revert.** For trait revert: use \`refine_soul\` with action=revert_trait and the traitId. For level-up revert: use \`level_up_soul\` with action=revert and the soulId.

5. **Verify the post-revert state.** Use \`inspect_souls_item\` to confirm: trait status, soul level, and essence should match the pre-mutation baseline.

6. **After stabilizing:** deposit 1–2 observation shards using \`observe_soul\` describing the regression pattern, tagged appropriately. This evidence will inform the next refinement cycle to avoid repeating the same mutation.

## Notes

Revert is not failure — it is the error-correction mechanism. An identity that can be reverted and repaired is more resilient than one that accumulates drift. The goal is not to never make wrong mutations; it is to detect and correct them quickly.`,
});
