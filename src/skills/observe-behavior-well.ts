import { defineSoulsSkill } from './skill_types.ts';

export const observeBehaviorWellSkill = defineSoulsSkill({
	name: 'observe-behavior-well',
	description: 'Deposit high-quality behavioral observations with correct source labels and tags.',
	content: `# Observe Behavior Well

Use this whenever you have evidence to deposit — after a session, delegation outcome, review cycle, or any behavioral signal worth preserving.

## Procedure

1. **Identify the exact behavioral pattern being observed.** Is it a concrete action, a missed action, a process failure, or a quality signal? Do not paraphrase into a general rule — preserve the specificity. Specific observations are indexable and clusterable. Generic ones collapse into noise that cannot drive meaningful trait refinement.

2. **Choose the source label** that accurately identifies the channel this observation comes from: "session", "delegation", "manual_review", "user_feedback", "retrospective", "monitoring", etc. Do not use "misc" or "unknown". Source diversity across shards is a crystallization gate condition.

3. **Choose 1–3 tags** that capture the topic domain: ["error_handling"], ["communication", "technical"], ["delegation", "docker"], etc. Tags enable scoped evidence queries. Reuse established tags where possible for clustering.

4. **Deposit the shard** using \`observe_soul\` with action=drop. Provide content (the specific observation), source (the channel label), soulIds (one or more attributed souls), and tags.

5. **Check the tool result.** If crystallizationTriggers is non-empty, note which souls have reached readiness. Do not immediately act on it — flag it for the next maintenance pass.

## Notes

Sealed shards (sealed=true) are only visible after reveal. Use them when evidence should only surface after a specific milestone — task completion, session close, batch import.`,
});
