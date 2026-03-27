import { defineSoulsSkill } from './skill_types.ts';

export const bootstrapNewSoulSkill = defineSoulsSkill({
	name: 'bootstrap-new-soul',
	description: 'Create a new soul with an initial essence and begin the observation cycle.',
	content: `# Bootstrap New Soul

Use this when introducing a new AI persona or role into the souls system for the first time.

## Procedure

1. **Draft the initial essence.** An essence is a narrative identity statement — not a list of traits. It should describe the core purpose, the primary operating mode, and the most important behavioral orientation of the soul. 3–5 sentences. First-person perspective is wrong; third-person is correct.

2. **Draft 2–4 initial traits.** Each trait needs a principle (the behavioral rule) and a provenance (the evidence or rationale that justifies it). Do not add traits you cannot yet justify — a soul with 0 traits and a strong essence is better than one with 5 unearned traits.

3. **Create the soul** using \`manage_soul\` with action=create. Provide name, essence (the drafted narrative), and description (a one-line summary of the soul's role).

4. **Add initial traits** using \`refine_soul\` with action=add_trait for each drafted trait. Include specific provenance for each.

5. **Deposit 2–3 initial observation shards** using \`observe_soul\` with action=drop. These should reflect the founding behavioral context — what the soul was observed doing when it was first instantiated.

6. **Verify the initial state.** Use \`inspect_souls_item\` to confirm: essence matches, traits are active, no unexpected capacity issues.

## Notes

Do not add more than 4 traits on bootstrap. The initial trait set is a hypothesis, not a final identity. Evidence will confirm, revise, or invalidate each trait in subsequent sessions.`,
});
