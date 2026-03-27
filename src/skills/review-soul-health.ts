import { defineSoulsSkill } from './skill_types.ts';

export const reviewSoulHealthSkill = defineSoulsSkill({
	name: 'review-soul-health',
	description:
		'Interpret the health metric, staleness signals, and capacity state to assess the overall condition of a soul.',
	content: `# Review Soul Health

Use this on a periodic basis (weekly, or whenever behavioral quality signals are ambiguous) to get an overall picture of each soul's health before deciding whether intervention is needed.

## Procedure

1. **List all active souls.** Use \`review_souls\` with view=list. Note each soul's level and any capacity warnings.

2. **Inspect each soul.** Use \`inspect_souls_item\` for each to get: health score (0–1), activeTraitCount/traitLimit ratio, pendingShardCount, and crystallizationReady flag.

3. **Interpret the health score:**
   - **≥ 0.7:** Healthy. Traits are fresh, evidence is flowing, capacity headroom exists. Continue normal observation cycle.
   - **0.4–0.69:** Warning zone. One or more signals are degraded. Use \`inspect_souls_item\` with includeEvidence=true to identify which dimension is causing the drop.
   - **< 0.4:** Needs attention. The soul is stale, at capacity, or evidence-starved. A refinement pass is overdue or the soul needs new observations.

4. **For souls scoring < 0.7:** use \`inspect_souls_item\` with includeEvidence=true to get the full evidence breakdown. Focus on the suggestedActions list and the stale trait signals.

5. **For each warning/unhealthy soul, determine the intervention:**
   - If pendingShardCount is low — increase observation frequency.
   - If stale trait count is high — run produce-trait-proposals-from-evidence.
   - If atCapacity — run judge-consolidation-versus-promotion and execute-level-up-plan.
   - If crystallizationReady — run the full refinement cycle.

6. **After completing any needed intervention:** stamp attunement using \`refine_soul\` with action=stamp_attuned to reset the recency baseline.

## Notes

Health is a lagging indicator — it reflects the accumulated state of evidence, trait freshness, and capacity. A sudden drop usually means a trait has gone stale or the observation rate has dropped. A sustained low score means the soul is being neglected.`,
});
