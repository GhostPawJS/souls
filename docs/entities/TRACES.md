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
| souls | Links with soulId, owner/counterpart/subject role, and createdAt |
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
