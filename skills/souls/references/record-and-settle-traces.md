# Record and Settle Traces

Record a trace for a dated fact, promise, belief, rule, decision, approval, or quest. Drop a shard for a behavioral observation interpreting what happened. A shard may cite traces through traceIds; this does not replace shard-to-trait citations.

| Record | Category | Links |
| --- | --- | --- |
| Quest | quest | owner holds the work |
| Promise | promise | owner promises, counterpart receives |
| Event | event | subject and counterpart as appropriate |
| Belief | belief | owner believes; weight is certainty |
| Rule or decision | rule or decision | owner holds the decision |
| Approval | approval | owner approves, counterpart receives |

1. Search review_traces before recording duplicate facts.
2. Use trace_soul record with text and at least one souls link. Set a category tag, optional dueAt, and optional weight between 0 and 1. Never include credentials.
3. Review due work with review_traces due. Use list, show, history, chain, changed, and stats for context. Keep the cursor returned by changed for the next read.
4. Close work using settle, as done or dropped, with a required reason. A second settlement conflicts. There is one closing verb.
5. Revise text, dates, weight, tags, or links with a reason; every change keeps an immutable snapshot. Unlink and untag require reasons.
6. Correct a settled fact by recording a new trace with supersedes pointing to the old one. Chains have one successor per trace and no cycles. List and readiness use heads by default.
7. Cite facts from behavioral shards with observe_soul traceIds or trace_soul cite. Only open or done chain heads strengthen readiness. Readiness needs a converged cluster of at least three shards across two sources; readiness legacy restores the earlier gate.

Example input:
```json
{"action":"record","text":"Review the draft","souls":[{"soul":"mentor","role":"owner"}],"dueAt":"2026-11-12","tags":["promise"],"weight":0.8}
```

CLI: ghostpaw-souls trace record "Review the draft" --soul mentor:owner --tag promise --due +3d --json
CLI: ghostpaw-souls trace settle 1 --as done --reason "Reviewed and delivered" --json
