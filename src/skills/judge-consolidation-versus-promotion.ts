import { defineSoulsSkill } from './skill_types.ts';

export const judgeConsolidationVersusPromotionSkill = defineSoulsSkill({
	name: 'judge-consolidation-versus-promotion',
	description:
		'Decide whether to consolidate, promote, or carry each trait during a level-up plan.',
	content: `# Judge Consolidation versus Promotion

Use this while constructing a level-up plan, after validating that crystallization is ready and the soul is at or near trait capacity.

## Procedure

1. **Read the evidence report and soul profile.** Use \`inspect_souls_item\` with includeEvidence=true. Collect: active trait list, trait signals (tenure, citationDensity, essenceRedundancy, stale, survivalCount), promotion candidates ranked by score, and consolidation suggestions.

2. **For each active trait, assign a disposition: PROMOTE, CONSOLIDATE, or CARRY.**

   - **PROMOTE** if: essenceRedundancy > 0.3 AND tenure > 0.7 AND citationDensity > 0.05. The principle is old, well-evidenced, and already echoed in the essence. Absorbing it into the essence does not lose information.
   - **CONSOLIDATE** if: similarity score with another trait is > 0.4 AND the paired traits cover the same behavioral domain. Merge into a single more comprehensive principle.
   - **CARRY** if: the trait is distinct, actively evidenced (citationDensity > 0.02), and not redundant with any other carried or consolidated trait.

3. **Every active trait must appear exactly once in the plan:** either in consolidations.sourceTraitIds, promotedTraitIds, or carriedTraitIds. No trait may be omitted. Duplicates are a validation failure.

4. **Draft the new essence.** It should: (1) absorb the behavioral patterns from promoted traits without verbatim copying, (2) remain a coherent narrative identity statement (not a list), (3) be distinct from the current essence — if it is the same, no level-up is warranted, (4) target 3–5 sentences.

5. **Review the full plan before passing it to \`level_up_soul\` validate action.** Check: is the new essence genuinely different? Are all trait IDs accounted for exactly once? Are promoted traits actually redundant with the new essence? If any check fails, revise the plan.

## Notes

The default trait limit is 10. The default crystallization threshold is 3 pending shards. Do not level up if the soul has < 3 active traits — there is not enough structure to consolidate. Do not promote traits that would leave the soul without sufficient operating principles.`,
});
