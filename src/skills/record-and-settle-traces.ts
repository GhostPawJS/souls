import { defineSoulsSkill } from './skill_types.ts';
export const recordAndSettleTracesSkill = defineSoulsSkill({
	name: 'record-and-settle-traces',
	description:
		'Record persistent facts and commitments, cite them as evidence, and settle their lifecycle.',
	content: `# Record and Settle Traces

Record a trace for a dated fact, promise, belief, rule, decision, approval, or quest. Drop a shard for a behavioral observation interpreting what happened. A shard may cite traces through traceIds; this does not replace shard-to-trait citations.

| Usage | Mapping |
| --- | --- |
| Flat work list | Open trace tagged \`quest\`, owner = working soul. Due is optional: a parking lot needs no due date. Settle done with the honest outcome as the reason; abandon with dropped. Group a questline using \`questline\` plus a tag named for the line. Prerequisites/unlocks, repeatables, rewards, and due-claim delivery are not modeled; keep using questlog for scheduling and recurrence. |
| Promises | Tag \`promise\`, due set, owner = promiser, counterpart = promisee. Kept = settle done; broken and cancelled = settle dropped, with the reason saying which. The settle rate counts both broken and cancelled as not kept; it cannot distinguish cancellation from a broken promise. |
| Interaction or relationship journal | Event trace tagged \`event\`, optionally \`note\`, recorded with \`--settled done\` and an honest reason. Owner = writer, subject = the other soul. Long running relationship prose belongs in a series of event traces, not one ever-edited text field. |
| Beliefs | Tag \`belief\`, weight = certainty, source kind as a category tag (\`explicit\`, \`observed\`, \`inferred\`, \`distilled\`). Correct with a new trace using supersedes; forget with settle dropped and a reason. To merge beliefs, pass all parent ids in supersedes. Append-only logs map to recording without supersedes. |
| Approvals | One trace tagged \`approval\`, owner = Fox (approver), counterpart = approved soul. Settle done when granted, dropped when declined. This replaces keeping an approval in two stores. |
| Rules and decisions | Tag \`rule\` or \`decision\` on Fox's soul. |

### What traces do not replace

- Recurring dates.
- Scheduling and recurrence; keep using questlog.
- Due-claim delivery.
- Contact identities and channels.
- Procedures and skills.

1. Search review_traces before recording duplicate facts.
2. Use trace_soul record with text and at least one souls link. Use settle: { as: "done", reason: "Delivered" } or CLI --settled done --reason "Delivered" to record a past event with record and settle revisions atomically. Set a category tag, optional dueAt, and optional weight between 0 and 1. Never include credentials.
3. Review due work with review_traces due. Use list, show, history, chain, changed, and stats for context. Keep the cursor returned by changed for the next read.
4. Close work using settle, as done or dropped, with a required reason. A second settlement conflicts. There is one closing verb.
5. Revise text, dates, weight, tags, or links with a reason; every change keeps an immutable snapshot. Unlink and untag require reasons. The final soul link cannot be removed; an owner is optional.
6. Correct a settled fact by recording a new trace with supersedes pointing to the old one. Chains have one successor per trace and no cycles. List and readiness use heads by default.
7. Cite facts from behavioral shards with observe_soul traceIds or trace_soul cite. Only open or done chain heads strengthen readiness. Readiness needs a converged cluster of at least three shards across two sources; readiness legacy restores the earlier gate.

Example input:
\`\`\`json
{"action":"record","text":"Review the draft","souls":[{"soul":"mentor","role":"owner"}],"dueAt":"2026-11-12","tags":["promise"],"weight":0.8}
\`\`\`

CLI: ghostpaw-souls trace record "Review the draft" --soul mentor:owner --tag promise --due +3d --json
Use trace roll 1 --next-due +7d to settle and carry a commitment forward atomically. Use trace list --state open --exclude-tag belief for commitments. Category prefixes use --tag-prefix series:. Read pages with --limit and --offset, or --all. Record JSONL atomically with trace record --batch file.jsonl (or --batch -). Use --import for historical update times. Compact old revision text only with an explicit trace compact command.

CLI: ghostpaw-souls trace settle 1 --as done --reason "Reviewed and delivered" --json
`,
});
