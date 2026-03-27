# `soul_shards`

## What It Is

`soul_shards` is the evidence accumulation table of Souls.

A shard is one atomic behavioral observation from any source, attributed to one
or more souls. Shards are the raw material for everything: crystallization
readiness, evidence reports, trait signals, consolidation suggestions, and
level-up decisions. They accumulate over time, get cited by traits, and
eventually fade when fully incorporated.

## Why It Exists

Most agent systems treat behavioral feedback as ephemeral — logged somewhere,
maybe reviewed, never structured. When it is time to improve behavior, someone
reads transcripts and edits a prompt by feel.

Souls treats every observation as a persistent evidence record that feeds a
structured refinement pipeline. The `soul_shards` table exists so:

- every observation is preserved regardless of immediate value
- evidence accumulates across independent channels and time windows
- the crystallization gate can measure when enough evidence has formed
- evidence reports cluster observations into weighted themes automatically
- individual observations can be traced back to the traits they informed

The "no shard cap" principle is deliberate: storing is a write concern, bounding
is a read concern, and the two are never conflated. A shard that seems redundant
today might be the fifth instance of a recurring pattern that finally pushes a
cluster past the crystallization threshold. Near-duplicate frequency IS the
signal — the cluster size is the weight.

## How To Use It

Deposit a shard when there is a behavioral observation worth preserving:

- "the agent handled this error gracefully"
- "the delegation prompt lacked Docker context"
- "the user reported satisfaction with response clarity"

Typical flow:

1. `write.dropShard(db, { content, source, soulIds, tags? })` — deposit the
   observation with a source label and soul attribution.
2. Check the returned `crystallizationTriggers` — note which souls have reached
   readiness.
3. `read.listShards(db, { soulId })` — browse pending evidence for a soul.
4. `read.searchShards(db, query)` — full-text search across shard content.
5. `write.citeShard(db, shardId, traitId)` — link a shard to the trait it
   informed during refinement.

## Good Uses

- session observations about agent behavior
- delegation outcomes (success, failure, quality signals)
- user feedback about interaction quality
- manual review notes from transcript audits
- retrospective reflections after a work session
- monitoring alerts about behavioral patterns

## Do Not Use It For

- the cognitive principles themselves — those are [traits](TRAITS.md)
- the narrative identity core — that is the soul's [essence](SOULS.md)
- level-up snapshots — those are [levels](LEVELS.md)
- beliefs, factual knowledge, or relationship data — those belong in other
  systems (Codex, Affinity)

Shards answer "what was observed?" — not "what behavioral rule should be
followed?" (traits), "who is this soul?" (essence), or "how did it evolve?"
(levels).

## Source Labels

The `source` field is an open string representing an independent evidence
channel. The engine never interprets source values — it only requires that they
exist for diversity counting during crystallization.

Examples: `"session"`, `"delegation"`, `"manual_review"`, `"user_feedback"`,
`"retrospective"`, `"monitoring"`, `"codex"`, `"quest_turnin"`.

The key rule: if two observations came through meaningfully different channels,
they should use different source values. Even a single human can produce multiple
evidence channels: a reflective note after a session (`manual_reflection`), a
later review pass (`manual_review`), or external feedback (`reader_feedback`).

## Tags

Shards carry optional tags via the `shard_tags` junction table. Tags are open
strings — the engine never interprets them. On write, tags are normalized to
lowercase, trimmed, and deduplicated per shard.

`source` answers WHERE an observation came from (the origin channel). Tags
answer WHAT it is about (the topic). These are orthogonal axes. A shard from
source `"delegation"` might be tagged `["error_handling", "docker"]`. A shard
from source `"manual_review"` might be tagged `["communication"]`.

Tags enable:

1. **Scoped evidence reports.** `read.formatEvidence(db, soulId, { tags })`
   filters shards to a topic subset before clustering.
2. **Dashboard breakdowns.** `read.shardCountsByTag(db, soulId)` provides the
   categorical view for domain-specific UIs.
3. **Cross-domain composability.** Consumers that map domain concepts to tags
   get structured categorization without encoding topics in shard content.

Tags do not participate in crystallization gating — that remains source-based.

## Lifecycle

A shard has two status values and a sealed flag:

| State | Meaning |
|---|---|
| `pending` | Available for evidence analysis, crystallization, and citation |
| `faded` | Cited by enough distinct traits; retired from the active evidence pool |
| `sealed` | Deferred observation; invisible until explicitly revealed |

Transitions:

| From | To | Trigger |
|---|---|---|
| `pending` | `faded` | `write.fadeExhaustedShards()` when cited by N+ distinct traits |
| `sealed` | `pending` (unsealed) | `write.revealShards()` |

Sealed shards follow the quest turn-in pattern: an external system deposits
sealed shards during an activity, then reveals them at the appropriate moment
(task completion, session close, batch import). Once revealed, a shard is
indistinguishable from a regular pending shard.

Faded shards are not deleted. Their historical record persists for audit and
lineage. A shard fades when it has been cited by `shardFadeCitations` (default:
2) distinct traits — it has been fully incorporated into the identity.

## N:M Attribution

Each shard is attributed to one or more souls via the `shard_souls` junction
table. A single observation like "the coordinator's delegation prompt lacked
Docker context, causing the specialist to make incorrect assumptions" is
attributed to both souls. Attribution uses structural routing (which souls
participated), not semantic similarity.

## Citations and Fading

The `shard_citations` junction table links shards to the traits they informed.
Citing a shard to a trait is provenance for the provenance — it documents the
evidence chain.

After being cited by `shardFadeCitations` (default: 2) distinct traits
(`COUNT(DISTINCT trait_id)`) across any souls, the shard fades. It stops
appearing in future evidence reports but its record persists. Citing the same
shard to the same trait multiple times does not accelerate fading.

Scientifically: small prediction errors update existing memory representations
while large errors trigger encoding of new ones. An observation cited by
multiple traits has been incorporated — its marginal informational value
diminishes naturally
([eLife 2024](https://elifesciences.org/reviewed-preprints/95849)).

## Evidence Intelligence

### Crystallization Readiness

A two-phase gate that determines when a soul has enough evidence for refinement:

1. At least `crystallizationThreshold` (default: 3) pending unsealed shards
   within the `shardExpiryDays` window
2. From 2+ distinct source values (hardcoded invariant)
3. With age spread exceeding 1 day between oldest and newest (hardcoded)
4. At least one shard created after `lastAttunedAt` (recency gate)
5. Forming at least 2 distinct clusters (single-linkage at
   `clusteringThreshold`)

Phase 1 (conditions 1–4) is a cheap SQL pre-check. Phase 2 (condition 5) loads
shard content and runs in-memory clustering — only triggered when all cheap
conditions pass.

### Evidence Report

`read.formatEvidence(db, soulId, options?)` returns a structured report with:

- **Clusters** — shards grouped by trigram Jaccard similarity, ranked by weight
  (`memberCount × sourceDiversity × avgFreshness`)
- **Trait alignment** — per-cluster label: `reinforcing` (overlaps existing
  trait) or `novel` (new territory)
- **Cross-soul overlap** — clusters where shards are also attributed to other
  souls
- **Trait signals** — tenure, staleness, citation count/density, essence
  redundancy, survival count
- **Tensions** — trait pairs with negation asymmetry (potential contradictions)
- **Consolidation suggestions** — trait pairs with high lexical similarity
- **Promotion candidates** — traits ranked by `tenure × citationDensity ×
  essenceRedundancy`
- **Shard velocity** — recent vs previous 14-day window trend
- **Suggested actions** — deterministic summary derived from all signals
- **Rendered markdown** — pre-rendered human-readable report string

The report is pre-digested. The consumer (LLM or human) focuses on judgment
rather than mechanical pattern detection.

## Supporting Tables

### `shard_souls`

Junction table linking shards to souls. Supports N:M attribution.

### `shard_citations`

Junction table linking shards to traits. Citation count drives the fading
lifecycle.

### `shard_tags`

Junction table for free-form categorization. Tags are normalized to lowercase.

### `shard_fts`

FTS5 virtual table content-synchronized with `soul_shards.content`. INSERT,
UPDATE, and DELETE triggers keep it in sync automatically. Enables fast full-text
search via `read.searchShards()`.

## Operator Notes

- Shard content is normalized on write: trimmed, whitespace collapsed.
- Tags are normalized on write: lowercased, trimmed, deduplicated per shard.
- The partial index on `status = 'pending'` means reads only scan the active
  pool regardless of total table size.
- Read-time expiry (`shardExpiryDays`, default: 120) excludes old shards from
  evidence reports without deleting them.
- Even 50,000 total shards with 300 pending per soul result in single-digit-
  millisecond evidence report queries.
- `dropShard()` returns crystallization triggers transparently — the consumer
  does not need a separate readiness check on every write.

## Related Tables

- [`souls`](SOULS.md): the identity records that shards are attributed to
- [`soul_traits`](TRAITS.md): the cognitive principles that shards cite and
  inform
- [`soul_levels`](LEVELS.md): level-up events driven by accumulated shard
  evidence

## Public APIs

### Writes

- `write.dropShard(db, input)`: deposit a single observation. Normalizes content
  and tags. Returns the shard and crystallization triggers.
- `write.dropShards(db, inputs)`: batch deposit with a single crystallization
  check at the end.
- `write.citeShard(db, shardId, traitId)`: link a shard to a trait.
- `write.revealShards(db, shardIds)`: unseal deferred observations.
- `write.fadeExhaustedShards(db, options?)`: fade shards cited by N+ distinct
  traits. Called during maintenance.

### Reads

- `read.listShards(db, options?)`: pending unsealed shards, filterable by soul,
  source, and tags.
- `read.searchShards(db, query, options?)`: FTS5 full-text search across shard
  content.
- `read.pendingShardCount(db, soulId)`: quick count per soul.
- `read.shardCountsPerSoul(db)`: overview across all souls.
- `read.shardCountsByTag(db, soulId?)`: tag frequency breakdown.
- `read.shardCountsBySource(db, soulId)`: source frequency breakdown.
- `read.crystallizationReadiness(db, options?)`: which souls are ready for
  refinement, with priority scores.
- `read.formatEvidence(db, soulId, options?)`: structured evidence report;
  accepts `tags` and `query` filters to scope to a topic subset.
