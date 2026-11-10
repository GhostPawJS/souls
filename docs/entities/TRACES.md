# Traces

A trace preserves a dated fact or commitment linked to one or more souls. Traces
persist independently of shards and traits. See [full specification](../TRACES.md).

| Field | Meaning |
| --- | --- |
| id, text | Stable identity and content |
| state | open, done, or dropped |
| weight | Optional certainty or importance from 0 to 1; null counts as 1 in statistics |
| createdAt, updatedAt | Epoch milliseconds; creation may be backdated |
| dueAt | Optional epoch milliseconds; bare days end at 23:59:59.999 UTC |
| settledAt, settleReason | Closing time and required reason |
| supersedes | Previous trace corrected by this one |
| revision | Monotonically increasing revision number |
| souls | Links with soulId, name, optional slug, owner/counterpart/subject role, and createdAt |
| tags | Trimmed lowercase category tags |

Tables are lazy: soul_traces, soul_trace_souls, soul_trace_tags,
soul_trace_revisions, and shard_traces. No trace read initializes the schema.
Revisions and traces cannot be deleted; revision updates are forbidden by triggers.
Every write runs transactionally and appends a JSON snapshot. Citation changes
also append a revision with kind cite. Link/tag additions may omit a reason;
revisions, settlement, unlink, and untag require reasons.

Use read.getTrace, listTraces, dueTraces, traceHistory, traceChain, changedSince,
and traceStats; write.recordTrace, reviseTrace, settleTrace, linkTraceSoul,
unlinkTraceSoul, tagTrace, untagTrace, and citeTrace. Inputs use soulId in the
library and soul references in MCP souls entries. Outputs use role/state names.

Supersedes chains are linear, reject cycles, and have a recursive depth cap of
1000. Only open or done heads strengthen readiness; dropped or superseded traces
remain available in history. Retired soul links remain stored.

## Mapping

| Usage | Mapping |
| --- | --- |
| Flat work list | Open trace tagged `quest`, owner = working soul. Due is optional: a parking lot needs no due date. Settle done with the honest outcome as the reason; abandon with dropped. Group a questline using `questline` plus a tag named for the line. Prerequisites/unlocks, repeatables, rewards, and due-claim delivery are not modeled; keep using questlog for scheduling and recurrence. |
| Promises | Tag `promise`, due set, owner = promiser, counterpart = promisee. Kept = settle done; broken and cancelled = settle dropped, with the reason saying which. The settle rate counts both broken and cancelled as not kept; it cannot distinguish cancellation from a broken promise. |
| Interaction or relationship journal | Event trace tagged `event`, optionally `note`, recorded with `--settled done` and an honest reason. Owner = writer, subject = the other soul. Long running relationship prose belongs in a series of event traces, not one ever-edited text field. |
| Beliefs | Tag `belief`, weight = certainty, source kind as a category tag (`explicit`, `observed`, `inferred`, `distilled`). Correct with a new trace using supersedes; forget with settle dropped and a reason. To merge two beliefs, the new trace supersedes one and the other is settled dropped with reason "merged into #N". Append-only logs map to recording without supersedes. |
| Approvals | One trace tagged `approval`, owner = Fox (approver), counterpart = approved soul. Settle done when granted, dropped when declined. This replaces keeping an approval in two stores. |
| Rules and decisions | Tag `rule` or `decision` on Fox's soul. |

### What traces do not replace

- Recurring dates.
- Scheduling and recurrence; keep using questlog.
- Due-claim delivery.
- Contact identities and channels.
- Procedures and skills.
