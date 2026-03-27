import { defineSoulsSkill } from './skill_types.ts';

export const produceTraitProposalsFromEvidenceSkill = defineSoulsSkill({
	name: 'produce-trait-proposals-from-evidence',
	description:
		'Read an evidence report, interpret signals, and propose add/revise/revert trait mutations.',
	content: `# Produce Trait Proposals from Evidence

Use this after running a maintenance pass and selecting a soul for refinement. Only proceed if crystallization is ready.

## Procedure

1. **Get the evidence report.** Use \`inspect_souls_item\` with includeEvidence=true for the soul. Read the full evidence report — clusters, trait signals, tensions, consolidation suggestions, promotion candidates, and suggested actions.

2. **Evaluate novel clusters.** For each novel cluster (alignment.kind = "novel"): is the pattern sufficiently distinct from existing traits? Does it represent a real behavioral pattern or a one-off incident? Novel clusters with weight > 1.5 and 2+ sources warrant a new trait proposal.

3. **Evaluate stale traits.** For each stale trait signal (stale = true): does the principle still reflect current behavior? Can you cite 2+ shards supporting it? If not, it is a revert or revision candidate.

4. **Evaluate consolidation suggestions.** For each suggestion: are the paired principles genuinely saying the same thing in different words, or are they usefully distinct? If genuinely redundant, propose a revision to the higher-citation trait to absorb the other.

5. **Produce a ranked list of proposed mutations:** (1) new traits from novel clusters, (2) revisions for stale or poorly evidenced traits, (3) reverts for traits with negative-signal evidence. Limit to the highest-value changes — do not saturate the soul with too many mutations at once.

6. **Apply each approved proposal** using \`refine_soul\` with the appropriate action (add_trait, revise_trait, revert_trait). Always include a specific provenance that references the evidence that drove the mutation.

7. **Stamp attunement** using \`refine_soul\` with action=stamp_attuned to record the attunement timestamp.

## Notes

Do not act on a single shard. Do not act on a single source. Evidence must converge across 2+ sources and 2+ clusters before a mutation is warranted. The suggestedActions list in the report is a starting triage, not a binding instruction.`,
});
