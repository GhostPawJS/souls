# Traces

A trace is a persistent, dated fact about one or more souls: something that
happened, something promised, something believed, a rule, a decision or an
approval. Shards stay what they always were, short behavioral observations
that crystallize into traits. Traces are the record that shards can point at
as evidence. Traces persist; shards interpret them.

Traces are an additive feature. Databases, commands, tools and outputs from
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
  kind       TEXT    NOT NULL,             -- record, revise, settle, link, unlink, tag, untag, cite
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
`yesterday`, `now`, `+Nd`/`-Nd` and `+Nh`/`-Nh`. Calendar words resolve in the zone
from `tz` (tool input or `--tz`), else `TZ`, else the host zone. A bare day resolves to local midnight in that zone; used as a due date
(`dueAt`, `--due`, `nextDue`, `--next-due`) it means the end of that local day
(23:59:59.999), so `--due 2026-11-12` with `TZ=Europe/Berlin` is
`2026-11-12T22:59:59.999Z`. With `tz` UTC this matches 0.6.0.
Explicit ISO offsets and epoch milliseconds identify absolute instants.
`at` sets settlement time; `createdAt` sets creation time independently.
Storage is always integer epoch milliseconds. Numeric seconds are rejected.

## Lifecycle

```
record ──► open (0) ──settle --as done    --reason ──► done (1)
                    └─settle --as dropped --reason ──► dropped (2)
```

- `record` needs `text` and at least one soul link. It creates an open trace by default. For an event that already happened, supply `settle: { as: "done", reason: "Delivered", at: "yesterday" }` (or `--settled done --reason "Delivered" --at yesterday`). This atomically writes revision 1 (record) and revision 2 (settle). Only settle closes an existing trace.
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
one successor (across primary and merge parents), and can have multiple parents. Setting `supersedes` is
rejected when the target does not exist, is the trace itself, already has a
successor, or when walking the chain from the target reaches the new trace
(cycle). The walk is a recursive CTE with a depth cap of 1000. The head of a
chain is the trace without a successor; list and readiness views use heads only
unless `includeSuperseded` is set.

Additional parents live in `soul_trace_merges(trace_id, parent_id, created_at)`.
The primary `supersedes` column and unique index remain unchanged. CLI
`--supersedes 4,5` or repeated flags use the first id as primary; tool input
accepts a number or an array. Outputs add `mergedFrom` for additional parents.
Every parent must exist, must not form a cycle, and may be consumed by only
one successor across both kinds of edge. Chain views include all branches.

## Roles

| code | role        | meaning                                              |
| ---- | ----------- | ---------------------------------------------------- |
| 0    | owner       | the soul that holds the trace (quest owner, believer) |
| 1    | counterpart | the other party (promisee, approver, counterparty)   |
| 2    | subject     | the soul the trace is about                          |

Inputs accept the name or the code; outputs carry the role name, soulId, soul name and slug when set. Unlink requires a reason and rejects removal of the final soul link. An owner is optional, so subject-only traces remain valid.

## Query surface

All trace reads are read-only and live in one tool, `review_traces`, and the
CLI noun `trace`:

| view      | CLI                                   | returns |
| --------- | ------------------------------------- | ------- |
| `list`    | `trace list [--soul s] [--role r] [--state open] [--tag t] [--exclude-tag t] [--tag-prefix p] [--limit n\|--all] [--offset n] [--due-before d] [--query q]` | all states, newest updated first; links and tags; heads only by default |
| `search` | `trace search <query> [--soul s] [--role r] [--state open] [--tag t] [--exclude-tag t] [--tag-prefix p] [--limit n\|--all] [--offset n]` | ranked text and settlement reason matches; default limit 20 |
| `due`     | `trace due [--soul s] [--within 3d] [--exclude-tag t] [--limit n\|--all] [--offset n]`  | open traces due within the window or overdue, overdue first |
| `show`    | `trace show <id>`                     | one trace with links, tags, chain and citing shards |
| `history` | `trace history <id>`                  | append-only revisions |
| `chain`   | `trace chain <id>`                    | the supersedes chain with weighted certainty |
| `changed` | `trace changed --since <date> [--limit n\|--all] [--offset n]`        | what changed since T across the store, plus a `cursor` to pass next time |
| `stats`   | `trace stats [--soul s] [--with s2] [--half-life-days 30] [--limit n\|--all] [--exclude-tag t]` | the numbers below |

`changed` covers traces (created, revised, settled), shards dropped or faded,
trait and essence revisions, level-ups and attunements since T, plus open traces
that became due or overdue. It never writes; callers keep the returned `cursor`. Keys are `traces`, `shards`, `revisions`, `levelUps`, `attunements`, `newlyDue`, `cursor`, and `since`. Items use camelCase timestamps: updatedAt for traces/shards, createdAt for revisions/level-ups, lastAttunedAt for attunements, and dueAt for newly due traces.

Lists and due views default to 100 records; changed pages the trace records at
100 while retaining the other change arrays and cursor. `--limit`, `--offset`,
and `--all` (tool `limit`, `offset`, `all`) control pages. Truncation emits a
notice on stderr in both output modes. Lists and changed add `truncated`,
`total`, and `next` offset to data. Due retains its data array and adds these
fields to the envelope, with `next` expressed as a tool continuation hint.
Finish all pages before advancing a changed cursor; pass the same `now` to
freeze the window across pages. Tag filters accept a trailing `*` prefix or
`--tag-prefix` / `tagPrefix`; exclusions use repeatable `--exclude-tag` or
`excludeTags`. The same category filters apply to stats.

Numbers in `stats`:

- **overdue per soul**: open traces with `due_at < now`, grouped by owner soul.
- **overdue across roles**: `overdueBySoul` counts each soul once per overdue
  trace, with `owner`, `counterpart`, and `subject` counts for its roles.
- **promise settle rate between two souls**: over traces with `due_at` linked to
  both souls, `done / (done + dropped + open and overdue)`; `null` when the
  denominator is zero. The existing numeric `promiseSettleRate` is accompanied by `promiseSettleRateDetails: { done, dropped, overdueOpen, rate }`. This legacy calculation includes all dated traces linking the selected pair, not only those tagged promise. Broken and cancelled promises both count as dropped and therefore not kept.
- **tagged promise settle rate**: `promiseSettleRateTagged` and
  `promiseSettleRateTaggedDetails` apply the same formula only to `promise` tags.
  The legacy fields above retain the all-dated-traces calculation.
- **bounded chain heads**: `chains` defaults to 20 entries; `limit` / `--limit`
  changes this and `all` / `--all` returns every head. `headsTotal` and
  `headsTruncated` describe the full population. `weights` follows the same
  limit, with `weightsTotal` and `weightsTruncated`.
- **weighted certainty along a chain**: `Σ weight_i · 0.5^depth_i / Σ 0.5^depth_i`,
  reported only for chain heads, depth 0 at the head; a NULL weight counts as 1.
- **recency-decayed weight**: `weight · 0.5^(age_days / half_life_days)`, age
  from `created_at`, half life 30 days by default.

## Writes

The write tool is `trace_soul` with actions `record`, `revise`, `settle`,
`roll`, `record_batch`, `compact`, `link`, `unlink`, `tag`, `untag` and `cite`. CLI equivalents:

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

| Usage | Mapping |
| --- | --- |
| Flat work list | Open trace tagged `quest`, owner = working soul. Due is optional: a parking lot needs no due date. Settle done with the honest outcome as the reason; abandon with dropped. Group a questline using `questline` plus a tag named for the line. Prerequisites/unlocks, repeatables, rewards, and due-claim delivery are not modeled; keep using questlog for scheduling and recurrence. |
| Promises | Tag `promise`, due set, owner = promiser, counterpart = promisee. Kept = settle done; broken and cancelled = settle dropped, with the reason saying which. The settle rate counts both broken and cancelled as not kept; it cannot distinguish cancellation from a broken promise. |
| Interaction or relationship journal | Event trace tagged `event`, optionally `note`, recorded with `--settled done` and an honest reason. Owner = writer, subject = the other soul. Long running relationship prose belongs in a series of event traces, not one ever-edited text field. |
| Beliefs | Tag `belief`, weight = certainty, source kind as a category tag (`explicit`, `observed`, `inferred`, `distilled`). Correct with a new trace using supersedes; forget with settle dropped and a reason. To merge beliefs, record one trace with all parent ids in supersedes. Append-only logs map to recording without supersedes. |
| Approvals | One trace tagged `approval`, owner = Fox (approver), counterpart = approved soul. Settle done when granted, dropped when declined. This replaces keeping an approval in two stores. |
| Rules and decisions | Tag `rule` or `decision` on Fox's soul. |

### What traces do not replace

- Recurring dates.
- Scheduling and recurrence; keep using questlog.
- Due-claim delivery.
- Contact identities and channels.
- Procedures and skills.

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

## Implementation notes

Citation writes use revision kind `cite` so the every-change history guarantee
also covers evidence edges. SQLite math functions compute recency decay when
available, in one pass joined to the filtered trace ids; builds without `pow` use the same formula in JavaScript. Existing
Souls databases retain their journal mode on open to preserve file bytes during
read-only use; newly created databases use WAL.

## Roll, batch, import and compaction

`trace roll <id> --next-due +7d [--as done|dropped] [--reason why]
[--at T] [--text replacement]` settles and records a successor in one
transaction. Defaults are done and reason "rolled forward". Text, tags, soul
links and roles, and weight carry forward; the new trace is open and supersedes
the old one. Any failure rolls back both writes. A consumed parent cannot roll
again. Library: `write.rollTrace`; tool: `trace_soul` action `roll`, `nextDue`.

`trace record --batch file.jsonl` or `--batch -` reads one record object per
line with the same fields as `trace_soul` record. All records succeed together;
errors identify the line. JSON output is an array, human output a count.
Library: `write.recordTraceBatch`; tool: `record_batch` with `items`.

`--import` / `import: true` preserves `createdAt` and sets `updatedAt` to the
provided `--updated-at` / `updatedAt`, otherwise creation time. The record
revision reason is `import`. Record-and-settle imports preserve that update
time too. `changed` uses updated_at, so historical imports do not appear as new
beyond a later cursor. Callers starting fresh after import should take a
`trace changed --since now` cursor (the literal `now` is accepted).

New snapshots deduplicate texts of at least 256 characters in
`soul_trace_texts(hash TEXT PRIMARY KEY, text TEXT NOT NULL) STRICT` using
SHA-256. Reads reconstruct the same snapshot objects; old inline rows remain
valid. `trace compact [--dry-run] [--vacuum] [--json]` explicitly rewrites old
snapshots in one transaction and reports `bytesBefore`, `bytesAfter`, and
`revisions`. These bytes count snapshot JSON only, excluding the text table.
Dry run is read-only. Append-only protection is restored within the transaction;
compaction never runs implicitly. Vacuum runs only when requested, after commit.
Library: `write.compactTraces`; tool: action `compact`.

## Output shape

Read results use a `data` envelope. Single-trace writes also include `data`
containing the trace, while retaining top-level `id` and other existing keys.
Batch CLI JSON output is the created trace array. Tool batch output uses `data`.
`call --help` lists tools; `call <tool> --help` lists input fields and an example.

### Search

Use `read.searchTraces(db, { query: 'review draft', soulId })`,
`review_traces` with `view: 'search'` and `query`, or
`souls trace search "review draft" --soul mentor --json`.
Terms are literal, combined with AND; a trailing `*` matches a word prefix.
FTS5 ranks matches by bm25 ascending, then update time descending and id.
The result includes `traces`, `total`, `truncated`, `next`, and
`mode: 'fts' | 'substring'`; each trace adds `rank`.

The index is created and backfilled on the first trace write after upgrade.
Reads never initialize or backfill it. If FTS5 is unavailable, the index is
absent, or MATCH fails, search uses a case-insensitive literal substring over
text and settlement reasons, with null ranks. Percent and underscore remain
literal in this fallback. Filters support soul, role, state, required `tags`,
`tag`, `excludeTags`, `tagPrefix`, and `includeSuperseded`.
Repeat CLI `--tag` to require multiple categories. Pagination accepts
`limit` (default 20), `offset`, or `all`.
