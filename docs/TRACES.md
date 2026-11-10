# Traces

A trace is a persistent, dated fact about one or more souls: something that
happened, something promised, something believed, a rule, a decision or an
approval. Shards stay what they always were, short behavioral observations
that crystallize into traits. Traces are the record that shards can point at
as evidence. Traces persist; shards interpret them.

Traces are additive in 0.6.0. Databases, commands, tools and outputs from
0.5.x keep working unchanged, and nothing about traces takes effect until the
first trace is written.

## Schema

The trace tables are created lazily by the first trace write
(`initTraceTables(db)`, also exported). Opening a database, rendering, reviewing
or any other read never creates them, so reads stay non-mutating and a 0.5.1
database is byte-identical until a trace is recorded. Every read path checks
for the tables and behaves as if there are no traces when they are absent.

```sql
CREATE TABLE soul_traces (
  id           INTEGER PRIMARY KEY,
  text         TEXT    NOT NULL CHECK (length(trim(text)) > 0),   -- content only
  state        INTEGER NOT NULL DEFAULT 0 CHECK (state IN (0, 1, 2)), -- 0 open, 1 done, 2 dropped
  weight       REAL    CHECK (weight IS NULL OR (weight >= 0 AND weight <= 1)),
  created_at   INTEGER NOT NULL,          -- epoch ms; may be back-dated for past events
  updated_at   INTEGER NOT NULL,          -- epoch ms of the latest revision
  due_at       INTEGER,                   -- epoch ms or NULL
  settled_at   INTEGER,                   -- epoch ms or NULL
  settle_reason TEXT,
  supersedes   INTEGER REFERENCES soul_traces(id),
  revision     INTEGER NOT NULL DEFAULT 1,
  CHECK ((state = 0 AND settled_at IS NULL AND settle_reason IS NULL)
      OR (state IN (1, 2) AND settled_at IS NOT NULL AND length(trim(settle_reason)) > 0))
) STRICT;
CREATE UNIQUE INDEX idx_trace_supersedes ON soul_traces(supersedes) WHERE supersedes IS NOT NULL;

CREATE TABLE soul_trace_souls (            -- n:m link with a numeric role
  trace_id INTEGER NOT NULL REFERENCES soul_traces(id),
  soul_id  INTEGER NOT NULL REFERENCES souls(id),
  role     INTEGER NOT NULL CHECK (role IN (0, 1, 2)), -- 0 owner, 1 counterpart, 2 subject
  created_at INTEGER NOT NULL,
  PRIMARY KEY (trace_id, soul_id, role)
) STRICT;

CREATE TABLE soul_trace_tags (             -- categories only, never values
  trace_id INTEGER NOT NULL REFERENCES soul_traces(id),
  tag      TEXT    NOT NULL,
  PRIMARY KEY (trace_id, tag)
) STRICT;

CREATE TABLE soul_trace_revisions (        -- append-only, enforced by triggers
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id   INTEGER NOT NULL REFERENCES soul_traces(id),
  revision   INTEGER NOT NULL,
  kind       TEXT    NOT NULL,             -- record, revise, settle, link, unlink, tag, untag
  snapshot   TEXT    NOT NULL,             -- JSON of the trace after the change, links and tags included
  reason     TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (trace_id, revision)
) STRICT;
-- BEFORE UPDATE and BEFORE DELETE triggers on soul_trace_revisions RAISE(ABORT).
-- A BEFORE DELETE trigger on soul_traces RAISE(ABORT): traces are never deleted.

CREATE TABLE shard_traces (                -- a shard cites a trace as evidence
  shard_id   INTEGER NOT NULL REFERENCES soul_shards(id),
  trace_id   INTEGER NOT NULL REFERENCES soul_traces(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (shard_id, trace_id)
) STRICT;
```

Indexes cover `soul_trace_souls(soul_id, role)`, `soul_traces(state, due_at)`,
`soul_traces(updated_at)`, `soul_trace_revisions(created_at)`,
`soul_trace_tags(tag)` and `shard_traces(trace_id)`.

Tags are normalized like shard tags (lowercase, trimmed) and name categories:
`belief`, `rule`, `decision`, `approval`, `promise`, `event`, `quest`. Values that
anything computes on (dates, weights, states, roles) live in typed columns.

## Dates

Every date input (`createdAt`, `dueAt`, `at`, `since`, `now`) accepts the same
forms as affinity and questlog 0.14.1: epoch milliseconds (>= 1e12), ISO 8601
with `Z` or an offset, `YYYY-MM-DD`, `DD.MM.YYYY`, `today`, `tomorrow`,
`yesterday`, `+Nd`/`-Nd` and `+Nh`/`-Nh`. Calendar words resolve in the zone
from `tz` (tool input or `--tz`), else `TZ`, else the host zone. A bare day used
as `dueAt` means the end of that day (23:59:59.999 UTC), as in affinity.
Storage is always integer epoch milliseconds. Numeric seconds are rejected.

## Lifecycle

```
record ──► open (0) ──settle --as done    --reason ──► done (1)
                    └─settle --as dropped --reason ──► dropped (2)
```

- `record` creates an open trace. It needs `text` and at least one soul link.
- `settle` is the one verb that closes a trace. `as` is `done` or `dropped`;
  `reason` is required for both. Settling sets `settled_at` (default now, or
  `at`). Settling a settled trace is a conflict (exit 4), not a silent no-op.
- Settled traces are final. A correction is a new trace that supersedes the old
  one. Text, due date, weight, tags and links can still be revised on any
  trace, with a reason, and every revision is kept.
- Traces are never deleted. A souls retire leaves its traces in place; trace
  queries skip retired souls unless asked for them.

## Revisions

Every change writes one row to `soul_trace_revisions` holding a JSON snapshot
of the whole trace after the change, its kind and its reason, and bumps
`soul_traces.revision` and `updated_at`. Triggers reject updates and deletes of
revision rows, so past evidence cannot be rewritten silently. `review_traces`
view `history` (CLI `trace history <id>`) returns the revisions in order.

## Supersedes chain

`supersedes` points a newer trace at the one it corrects. A trace has at most
one successor (unique index), so each chain is linear. Setting `supersedes` is
rejected when the target does not exist, is the trace itself, already has a
successor, or when walking the chain from the target reaches the new trace
(cycle). The walk is a recursive CTE with a depth cap of 1000. The head of a
chain is the trace without a successor; list and readiness views use heads only
unless `includeSuperseded` is set.

## Roles

| code | role        | meaning                                              |
| ---- | ----------- | ---------------------------------------------------- |
| 0    | owner       | the soul that holds the trace (quest owner, believer) |
| 1    | counterpart | the other party (promisee, approver, counterparty)   |
| 2    | subject     | the soul the trace is about                          |

Inputs accept the name or the code; outputs carry the name.

## Query surface

All trace reads are read-only and live in one tool, `review_traces`, and the
CLI noun `trace`:

| view      | CLI                                   | returns |
| --------- | ------------------------------------- | ------- |
| `list`    | `trace list [--soul s] [--role r] [--state open] [--tag t] [--due-before d] [--query q]` | traces with links and tags; heads only by default |
| `due`     | `trace due [--soul s] [--within 3d]`  | open traces due within the window or overdue, overdue first |
| `show`    | `trace show <id>`                     | one trace with links, tags, chain and citing shards |
| `history` | `trace history <id>`                  | append-only revisions |
| `chain`   | `trace chain <id>`                    | the supersedes chain with weighted certainty |
| `changed` | `trace changed --since <date>`        | what changed since T across the store, plus a `cursor` to pass next time |
| `stats`   | `trace stats [--soul s] [--with s2] [--half-life-days 30]` | the numbers below |

`changed` covers traces (created, revised, settled), shards dropped or faded,
trait and essence revisions, level-ups and attunements since T, plus open traces
that became due or overdue. It never writes; callers keep the returned `cursor`.

Numbers in `stats`, all computed in SQL:

- **overdue per soul**: open traces with `due_at < now`, grouped by owner soul.
- **promise settle rate between two souls**: over traces with `due_at` linked to
  both souls, `done / (done + dropped + open and overdue)`; `null` when the
  denominator is zero.
- **weighted certainty along a chain**: `Σ weight_i · 0.5^depth_i / Σ 0.5^depth_i`,
  depth 0 at the head; a NULL weight counts as 1.
- **recency-decayed weight**: `weight · 0.5^(age_days / half_life_days)`, age
  from `created_at`, half life 30 days by default.

## Writes

The write tool is `trace_soul` with actions `record`, `revise`, `settle`,
`link`, `unlink`, `tag`, `untag` and `cite`. CLI equivalents:

```
souls trace record <text> --soul mentor[:owner] [--soul fox:counterpart] [--tag promise] [--due +3d] [--weight 0.8] [--supersedes 12] [--at 2026-11-09] [--tz Europe/Berlin] [--json]
souls trace revise <id> --reason why [--text ...] [--due ...|none] [--weight ...|none]
souls trace settle <id> --as done|dropped --reason why [--at ...]
souls trace link <id> --soul fox:counterpart [--reason ...]   |  trace unlink <id> --soul fox:counterpart --reason why
souls trace tag <id> --tag approval  |  trace untag <id> --tag approval --reason why
souls trace cite <shardId> <traceId>
souls shard observe <content> --source s --soul-ids mentor --trace-ids 4,5
```

Every state-changing command takes `--json` and prints the trace with a
top-level `id`.

## Mapping

| from                    | as a trace |
| ----------------------- | ---------- |
| quest (questlog)        | tag `quest`, `due_at` optional, owner = the working soul; finish = settle done, abandon = settle dropped |
| promise (affinity)      | tag `promise`, `due_at` set, owner = promiser, counterpart = promisee, weight = importance |
| event (affinity)        | tag `event`, no `due_at`, `created_at` = when it happened, subject/counterpart links as needed; recorded settled `done` or left open |
| belief (codex)          | tag `belief`, weight = certainty, corrections via `supersedes` |
| rule or decision by Fox | tag `rule` or `decision`, owner = Fox's soul |
| approval                | tag `approval`, owner = the approver (Fox), counterpart = the approved soul; one trace, two links |

Fox and every bot are souls, so traces link to them the same way.

## Reconciliation audit

| process | change | why |
| ------- | ------ | --- |
| shard drop (`observe_soul` drop, drop_batch) | Optional `traceIds` cite traces at drop time; unknown ids fail the drop. Without `traceIds`, unchanged. | Shards interpret traces; linking at drop is the common case. |
| cite (`refine_soul` cite_shard) | Unchanged for shard → trait. New `trace_soul` `cite` links shard → trace. | Two different kinds of evidence edge; neither replaces the other. |
| readiness (`review_souls` readiness, profiles, maintenance) | Stricter by default: ready needs at least one converged cluster, a cluster of at least `minClusterSize` shards (default 3) from at least two sources. Shards citing the same live trace (open or done, chain head) join one cluster. Results add `convergedClusterCount`, `largestClusterSize` and `traceBackedCount`; priority gains a factor `1 + mean live trace weight` of backed shards. `readiness: 'legacy'` (option, `--readiness legacy`, or `config set readiness legacy`) restores the 0.5.1 gate. | Quest 47: 10 souls showed ready with every shard in its own cluster. Converged clusters are what refinement needs; trace backing is stronger evidence. |
| crystallize (evidence gate on refine, update, level-up) | Uses the same readiness check, so it follows the stricter default and the legacy switch. Dropped and superseded traces never count. | One definition of ready across the library. |
| refine (`refine_with_evidence`, add, revise) | Unchanged inputs. Revisions keep their shard ids; trace ids are derived through `shard_traces`, so history shows the traces behind a change in `review` and evidence output. | Traces become visible as the facts behind identity without a second citation path. |
| level (level-up, revert) | No change to consolidation or revert. Level validation reports `traceBackedCount` per carried shard group. | Level-up consolidates traits; traces are not identity and are not consumed. |
| render (`render`, publish, diff) | Unchanged by default, byte for byte. Opt-in `--traces open|due` (`traces` option) appends an open-commitments block after the identity. | The prompt stays identity; callers can opt in to carrying open promises. |
| fade | Unchanged. | Fading is about shard age; traces persist on their own. |
| evidence formatting | Shards with trace citations add a `backs: trace #id (state)` line; shards without citations render as before. | Readers see the facts behind each observation. |
| credentials | Trace text and settle reasons that look like a credential (private key blocks, common token prefixes, `password=`-style pairs) are rejected. Shard drops get a warning for the same patterns. | Traces and shards are evidence, never a secret store; warning on shards keeps 0.5.x inputs working. |
