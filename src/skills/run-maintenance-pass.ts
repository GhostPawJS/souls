import { defineSoulsSkill } from './skill_types.ts';

export const runMaintenancePassSkill = defineSoulsSkill({
	name: 'run-maintenance-pass',
	description:
		'Run the standard maintenance cycle, interpret results, and triage souls ready for refinement.',
	content: `# Run Maintenance Pass

Run this at the start of each work session, after depositing a batch of shards, or on a scheduled interval. The maintenance cycle is deterministic and cost-free.

## Procedure

1. **Run \`review_souls\` with view=maintenance.** This atomically fades exhausted shards and returns souls whose crystallization conditions are met. Running maintenance before any refinement decision ensures the evidence pool is clean and the readiness list is current.

2. **Check fadedShardCount.** If > 0, note how many shards have been cycled out. This is normal — evidence that has been fully cited gets retired from the active pool.

3. **Review the readySouls list.** Sort by priorityScore (already sorted). High score = many shards × high source diversity × age spread × recency. The top-ranked soul is the most overdue for refinement.

4. **For each ready soul, decide whether to proceed with refinement now or defer.** Proceed if: (1) there is time for a full refinement pass, (2) the soul is not already undergoing a level-up, and (3) the evidence has had sufficient time to crystallize. Defer otherwise.

5. **For souls you decide to act on:** use \`inspect_souls_item\` to get the profile (capacity, trait count, health) and set includeEvidence=true to get the full evidence report with clusters and suggested actions.

## Notes

If readySouls is empty after maintenance, there is nothing to refine. Return to observation. The system is working correctly.`,
});
