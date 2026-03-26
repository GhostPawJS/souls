# Souls

Souls is a standalone prompt evolution engine. It stores cognitive identity as
narrative essence plus evidence-backed traits, with structured level-up,
crystallization-gated refinement, and full rollback. Not a prompt template
library. Not a configuration manager. An evolutionary algorithm for how agents
think.

`questlog` is about commitments in time. `affinity` is about people and
relationships. `codex` is about belief. `souls` is about cognitive identity.

The point is not to configure more. The point is to grow sharper.

## The Soul Atom

A soul is one cognitive identity plus the minimum metadata needed to render,
refine, and evolve it.

| Field           | Type              | Meaning                                        |
| --------------- | ----------------- | ---------------------------------------------- |
| `name`          | text              | unique identifier                              |
| `slug`          | text or null      | optional machine-friendly alias                |
| `essence`       | text              | narrative backstory — the stable identity core |
| `description`   | text              | short summary for listings and cards           |
| `level`         | integer           | current evolutionary generation                |
| `deletedAt`     | timestamp or null | dormancy marker                                |
| `lastAttunedAt` | timestamp or null | recency gate for refinement cycles             |

One soul carries one cognitive identity. Not a prompt template. Not a tool
config. How an agent — or persona, or role, or specialist — thinks, judges, and
approaches problems. A soul does not contain tool documentation (that is a
capability concern), procedural checklists (that is a skill), or delegation
rules (that is routing). Mixing these in hits the constraint-density ceiling
faster and couples identity to infrastructure that changes independently.

The essence is written as narrative prose, not a bullet list, because research
shows narrative backstories improve behavioral consistency by 18–27% over trait
enumerations ([EMNLP 2024](https://aclanthology.org/2024.emnlp-main.723)). A
coherent story creates a cognitive frame the model inhabits; a bullet list
creates a checklist it intermittently consults.

The essence is protected from routine mutation. Single-trait additions do not
touch it. Only a level-up event restructures the essence through the normal
evolutionary lifecycle, following the
[VIGIL](https://arxiv.org/abs/2512.07094) principle: the core identity block
stays stable while the adaptive section (traits) evolves. `updateSoul` can
overwrite the essence directly as an administrative escape hatch — bootstrapping
a new soul, correcting a catastrophic error, or manual intervention. It is not
part of the refinement lifecycle and bypasses all evolutionary mechanics.

## Grammar

| Concept             | Name              | Notes                                     |
| ------------------- | ----------------- | ----------------------------------------- |
| system              | `Souls`           | RPG-native; identity, not config          |
| core unit           | `Soul`            | one cognitive identity                    |
| narrative identity  | `Essence`         | prose backstory, stable between level-ups |
| cognitive principle | `Trait`           | evidence-backed behavioral rule           |
| observation         | `Shard`           | behavioral evidence from any source       |
| generation counter  | `Level`           | evolutionary milestone                    |
| refinement cycle    | `Attunement`      | maintenance + conditional improvement     |
| consolidation event | `Level-Up`        | restructuring of essence and traits       |
| inactivity          | `Dormancy`        | retired but fully preserved               |
| trait evidence      | `Provenance`      | how the trait was earned                  |
| shard linkage       | `Citation`        | connects a shard to the trait it informed |
| readiness signal    | `Crystallization` | gated check for refinement eligibility    |

### Verbs

- `Create` — register a new soul with name and essence
- `Render` — produce the identity block (essence + active traits) as markdown
- `Add Trait` — attach a new cognitive principle with provenance
- `Revise Trait` — update an existing trait's principle or provenance
- `Revert Trait` — soft-remove from active set; audit trail preserved
- `Reactivate Trait` — restore a reverted, consolidated, or promoted trait
- `Level Up` — execute a consolidation plan: merge, promote, carry, rewrite
  essence
- `Revert Level-Up` — full rollback of the last level-up event
- `Drop Shard` — deposit a behavioral observation with source and soul
  attribution
- `Cite Shard` — link a shard to the trait it informed
- `Seal` / `Reveal` — deferred observation lifecycle (quest turn-in pattern)
- `Retire` — enter dormancy; full history preserved
- `Awaken` — restore from dormancy

Forbidden system nouns: Persona, Profile, Agent, Config, Template, Preset,
Mode. Each misses the center of gravity — identity is not configuration.

## Traits

A trait is one cognitive principle plus the evidence chain proving it was
earned.

| Field        | Type       | Meaning                                          |
| ------------ | ---------- | ------------------------------------------------ |
| `principle`  | text       | the cognitive rule                               |
| `provenance` | text       | evidence chain proving how it was earned         |
| `generation` | integer    | the soul level when this trait was added         |
| `status`     | enum       | `active`, `consolidated`, `promoted`, `reverted` |
| `mergedInto` | id or null | which merged trait absorbed this one             |

Every trait must have non-empty provenance. No provenance, no trait. This is
not bureaucracy. Targeted evidence feedback reliably improves quality through
12 iterations, while vague "be better" feedback plateaus or _reverses_ quality
after 2–3 iterations. The differentiator is feedback specificity — the
provenance requirement on every trait
([arXiv:2509.06770](https://arxiv.org/abs/2509.06770), Sep 2025).

Structuring identity as discrete, editable principles yields +10.9% F1 across
6 benchmarks versus monolithic prompt text. Individual traits can be surgically
added, revised, or removed without touching the rest
([ConstitutionalExperts](https://aclanthology.org/2024.acl-short.52/),
ACL 2024).

### Status Lifecycle

- `active` — live and rendered in the identity block every turn
- `consolidated` — merged into a richer combined trait during level-up;
  `mergedInto` points to the successor
- `promoted` — absorbed into the essence narrative during level-up; the
  knowledge is now part of who the soul is, not a separate rule
- `reverted` — surgically removed from the active set; full record preserved
  for audit and potential reactivation

All statuses are terminal except `active`. A reverted, consolidated, or
promoted trait can be reactivated if the judgment was wrong.

## Shards

A shard is one behavioral observation from any source, attributed to one or
more souls.

| Field     | Type    | Meaning                          |
| --------- | ------- | -------------------------------- |
| `content` | text    | the behavioral observation       |
| `source`  | text    | open-ended origin label          |
| `status`  | enum    | `pending`, `faded`               |
| `sealed`  | boolean | hidden until explicitly revealed |

Shards are the universal accumulation mechanism. Every observation enters the
same lifecycle through one of two surfaces: `dropShard()` for single writes and
`dropShards()` for batch writes. Both store first, never block, and never ask
the consumer to make a decision. On write, the content is normalized: trimmed,
collapsed whitespace, stripped of leading/trailing punctuation noise. Tags are
normalized too: lowercased, trimmed, and deduplicated per shard. This ensures
clustering, FTS5 matching, and tag filtering work on clean data without
requiring callers to pre-process.

`dropShard()` returns the inserted shard's ID and an array of soul IDs that
crossed the crystallization threshold (if any). The crystallization check is a
two-phase gate: a cheap SQL pre-check (count, source diversity, age spread,
recency) runs on every insert. Only souls that pass all four cheap conditions
proceed to the cluster diversity check — which loads pending shard content and
runs in-memory clustering. In practice, the expensive path fires rarely (a soul
must already have enough evidence from multiple sources over multiple days),
keeping `dropShard()` fast in the common case.

`dropShards()` is a bulk convenience wrapper over the same lifecycle. It inserts
all provided shards in one transaction and returns `{ shardIds, readySoulIds }`.
Validation is fail-fast: if any shard is invalid, nothing is written. After the
batch insert completes, one crystallization pass runs over the affected souls.
This makes bootstrapping and historical imports efficient without inventing a
second shard lifecycle.

The `source` field is an open string representing an independent evidence
channel — not a generic label, not a topic, not a category. Examples:
`"delegation"`, `"distillation"`, `"codex"`, `"quest_turnin"`,
`"manual_reflection"`, `"manual_review"`, `"reader_feedback"`,
`"session_observation"`. The package never interprets source values. It only
requires that they exist for diversity counting during crystallization.

The key rule: if two observations came through meaningfully different channels,
they should use different source values. In a low-tech manual workflow, the same
human can still produce multiple evidence channels: a reflective note after a
session (`manual_reflection`), a later review pass over transcripts
(`manual_review`), or external feedback (`reader_feedback`). The invariant is
cross-channel convergence, not multi-user participation.

### No Shard Cap

Storing is a write concern. Bounding is a read concern. The two are never
conflated. Every observation is accepted because a shard that seems redundant
today might be the fifth instance of a recurring pattern that finally pushes a
cluster past the crystallization threshold. Deleting it destroys signal.

Near-duplicate frequency IS the signal. If the same observation surfaces five
times in different words across three weeks, that is not noise to deduplicate.
It is a recurring theme with urgency. The cluster size is the weight. The engine
detects this at read time through lexical clustering and surfaces it in the
evidence report.

What keeps reads fast with thousands of shards:

- **Partial index** on `status = 'pending'` — reads only scan the active pool
  regardless of total table size
- **FTS5 virtual table** on shard content, maintained by triggers on insert —
  enables fast lexical similarity without loading content into memory. All FTS5
  queries join back to `soul_shards` and filter on `status = 'pending'` plus the
  expiry cutoff, so faded and expired shards never appear in results.
- **Read-time expiry cutoff** — shards older than `shardExpiryDays` are excluded
  from evidence reports and crystallization queries but remain in the table for
  audit and lineage

With these, even 50,000 total shards and 300 pending per soul result in
single-digit-millisecond evidence report queries. SQLite is absurdly fast at
indexed reads.

### N:M Attribution

Each shard is attributed to one or more souls via a junction table. A single
observation like "the coordinator's delegation prompt lacked Docker context,
causing the specialist to make incorrect assumptions" is attributed to both
souls. The attribution uses structural routing (which souls participated, which
delegated to which), not semantic similarity. Structural, not inferential. Zero
additional tokens.

### Sealed Observations

Sealed shards are invisible to crystallization and evidence reports until
explicitly revealed. The pattern: an external system deposits sealed shards
during an activity; revealing them at the appropriate moment (turn-in,
completion, session close) makes them eligible for crystallization. Deferred
observation. When revealed, the shard's `sealed` flag is set to `false` and
its status remains `pending` — it is now indistinguishable from a regular
shard and follows the standard lifecycle from that point on.

### Citations and Fading

Citation links a shard to the trait it informed — provenance for the
provenance. After being cited by `shardFadeCitations` (default: 2) distinct
traits (counted as `COUNT(DISTINCT trait_id)` in `shard_citations`) across any
souls, the shard fades. It stops appearing in future evidence reports but its
historical record persists. This means citing the same shard to the same trait
multiple times does not accelerate fading.

Scientifically: small prediction errors update existing memory representations
while large errors trigger encoding of new ones. An observation cited by
multiple traits has been incorporated — its marginal prediction error diminishes
naturally, and fading reflects this reduction in informational value
([eLife 2024](https://elifesciences.org/reviewed-preprints/95849)).

### Shards as the Fragment Interface

Shard sources and optional tags are the mechanism through which external
packages contribute to soul evolution. Domain packages deposit observations
about their operations via shards. The orchestrator deposits delegation
outcomes via shards. The user deposits manual observations via shards. All
enter the same lifecycle: accumulate, crystallize, get cited in traits, and
fade.

This is the lean equivalent of a typed fragment registry. No separate schema
that the package must maintain for external content beyond shards plus optional
tags. The consumer defines what source channels exist, what tags exist, and what
observations look like. The engine accumulates and gates.

### Tags

Shards carry an optional set of tags via a `shard_tags(shard_id, tag)` junction
table. Tags are open strings like sources — the engine never interprets them.
On write, tags are normalized to lowercase, trimmed, and deduplicated per
shard. Tags are categorical keys, not free prose.

`source` answers WHERE an observation came from (the origin channel). Tags
answer WHAT it is about (the topic). These are orthogonal axes. A shard from
source `"delegation"` might be tagged `"error_handling"` and `"docker"`. A
shard from source `"manual_review"` might be tagged `"communication"`.

Tags enable three things without adding engine complexity:

1. **Scoped evidence reports.** `formatEvidence(db, soulId, { tags })` filters
   pending shards to a topic subset before clustering. A game designer asks
   "show me evidence about combat" without wading through dialogue observations.
2. **Dashboard breakdowns.** `shardCountsByTag(db, soulId)` provides the
   categorical view consumers need for domain-specific UIs.
3. **Cross-domain composability.** Consumers that map domain concepts to tags
   get structured categorization for free, without encoding topics in shard
   content or overloading the source field.

Tags do not participate in crystallization gating — that remains source-based.
Tags are a read-time filtering and grouping concern, not a lifecycle concern.
A shard with no tags is perfectly normal and participates in all mechanics
unchanged.

## Core Mechanics

### Trait Limit and the Constraint Density Cliff

Each soul has a configurable cap on active traits (default: 10). This is not
arbitrary. Constraint adherence drops from 78% to 33% as system prompt rules
accumulate past 4 constraints, measured across 19 LLMs and 7 model families
([arXiv:2505.07591](https://arxiv.org/abs/2505.07591), May 2025). The limit
prevents stacking past the effectiveness ceiling.

The cap signals when restructuring is needed, not when to keep stacking.
When active traits approach the limit, the soul is ready to level up.

### Crystallization

Crystallization is the gating mechanism for refinement readiness. A soul
crosses the threshold when all five conditions hold:

1. Only shards within the `shardExpiryDays` window are considered (read-time
   expiry cutoff applies to all crystallization checks)
2. At least `crystallizationThreshold` (default: 3) pending unsealed shards,
   forming at least 2 distinct clusters (single-linkage at
   `clusteringThreshold`). Raw count alone could be satisfied by three near-
   identical shards — requiring 2+ clusters ensures genuine diversity of signal
3. From 2+ distinct source values (hardcoded invariant)
4. With age spread exceeding 1 day between oldest and newest (hardcoded
   invariant)
5. At least one shard was created after `lastAttunedAt` (recency gate)

The source diversity and age spread requirements are research-backed invariants,
not configurable knobs:

- **Evidence accumulation threshold.** The anterior cingulate cortex integrates
  independent sources of evidence into coherent belief representations —
  experiential and observational evidence combine into a unified signal before
  driving behavioral change. The crystallization threshold mirrors this: trait
  proposals only trigger after a meaningful multi-source evidence cluster forms
  ([Nature 2025](https://www.nature.com/articles/s41586-025-09885-0)).
- **Incubation period.** Insight produces representational change in domain-
  specific cortex paired with hippocampal activity, and insight-driven solutions
  form stronger memory traces than non-insight solutions. The age spread
  requirement enforces a delay that allows disparate observations to crystallize
  into coherent schemas rather than being processed immediately
  ([Nature Communications 2025](https://www.nature.com/articles/s41467-025-59355-4)).
- **Blocked training.** Blocked training (one schema at a time) forms stronger
  distinct schemas than interleaved training across multiple categories. This
  backs the one-soul-per-refinement-cycle constraint
  ([Beukers et al., Communications Psychology 2024](https://www.nature.com/articles/s44271-024-00079-4)).
- **Source diversity.** The 2+ source requirement is an engineering guard against
  single-source confirmation bias: observations from only one channel may
  reflect that channel's biases rather than genuine behavioral patterns.
  Requiring convergence across independent sources before triggering refinement
  raises the signal-to-noise ratio of the evidence pool.

The recency gate (`lastAttunedAt`) ensures LLM tokens are spent exactly once
per evidence cluster. A soul that was just refined will not re-enter readiness
until genuinely new observations accumulate. The maintenance cycle can run at
high frequency (every few minutes) because 99%+ of ticks execute only
deterministic checks: pure SQL, zero tokens, sub-millisecond.

### Level-Up

When traits approach capacity, a consolidation event restructures the soul.
The consumer provides a `LevelUpPlan`:

```typescript
interface ConsolidationGroup {
  sourceTraitIds: number[];
  mergedPrinciple: string;
  mergedProvenance: string;
}

interface LevelUpPlan {
  newEssence: string;
  consolidations: ConsolidationGroup[];
  promotedTraitIds: number[];
  carriedTraitIds: number[];
}
```

The engine validates completeness: every active trait must appear exactly once
across consolidations, promotions, and carries. No orphans. On validation
failure, the error includes a structured diff — which traits are missing, which
appear in multiple groups, which reference non-active traits — so the consumer
can fix the plan without re-inspecting the full trait list. On validation
success with warnings, the engine annotates suggestions: consolidation groups
where member traits have low mutual similarity (below `consolidationThreshold`)
are flagged as "weak consolidations," and promoted traits with low
`essenceRedundancy` are flagged as "premature promotions." These are advisory,
not blocking — the consumer decides whether to proceed. Then:

1. **Consolidated traits** — status moves to `consolidated`, `mergedInto` set
   to the new merged trait. A new trait is created as `active` with the merged
   principle and provenance.
2. **Promoted traits** — status moves to `promoted`. The knowledge is absorbed
   into the new essence narrative and no longer occupies a trait slot.
3. **Carried traits** — generation bumped to the new level. Unchanged otherwise.
4. **Essence replaced.** Level incremented. Full before/after snapshot recorded
   in the level history.

The result: a soul with fewer active traits, a richer essence, and room for the
next generation of evidence. Three separate error-handling traits become one
mastery: "How you approach failure." The merged trait is stronger because it
captures the shared pattern while dropping redundant specifics.

Research:

- Restructuring the optimization trace yields +4.7% over state-of-the-art at
  25% of the prompt generation budget. Level-up consolidation is this mechanism
  ([GRACE](https://arxiv.org/abs/2509.23387), Sep 2025).
- Memetic algorithms (local search + global restructuring) achieve exponential
  speedup over pure evolutionary approaches on structured problems — polynomial
  time versus superpolynomial. The trait-addition + level-up dual mode is exactly
  this structure
  ([Memetic algorithm research](https://eprints.whiterose.ac.uk/id/eprint/162048/)).

**Level-up revert** restores the previous essence, reactivates all consolidated
and promoted traits, deletes the merged trait rows, and decrements the level.
Citations pointing to the deleted merged traits are removed, which may drop
shards below the fade threshold — those shards automatically return to `pending`
status, making their evidence available again for the next refinement cycle.
Full undo. The complete before/after state is preserved in the level history, so
any level-up can be inspected and reversed.

### Maintenance

One deterministic operation, zero tokens:

- **Fade exhausted shards** — shards cited by `shardFadeCitations` (default: 2)
  distinct traits (`COUNT(DISTINCT trait_id)`) move to `faded` status.

No shard expiry deletion, no shard cap enforcement. Expiry is a read-time
cutoff: queries include `AND created_at > (now - shardExpiryDays)` and old
shards naturally fall out of active calculations without being destroyed. This
keeps maintenance to a single SQL update, sub-millisecond.

The consumer follows maintenance with a crystallization readiness check — pure
SQL, returns which souls (if any) have crossed the refinement threshold with a
priority score for tiebreaking:

```text
priority = pendingCount × sourceDiversity × ageSpreadDays × recencyFactor
recencyFactor = 1 / max(1, daysSinceLastAttuned)
```

When multiple souls are ready simultaneously, this deterministic score picks the
most urgent one. Blocked training research says one soul per cycle — the
priority score decides which one.

### Refinement (Phase 2 — Consumer-Driven)

The package does not call an LLM. It provides:

1. `crystallizationReadiness(db)` — which souls are ready, with priority scores
2. `formatEvidence(db, soulId, options?)` — pre-digested evidence report, with
   optional `tags` / `query` scoping (see below)
3. Write functions: `addTrait`, `reviseTrait`, `revertTrait`, `levelUp`
4. `stampAttuned(db, soulId)` — update the recency gate after refinement

The consumer decides how to produce refinement decisions: an LLM mentor call, a
human reviewing a UI, scripted rules, or any other judgment mechanism. The
engine validates every mutation and applies it. The consumer provides the
intelligence; the engine provides the structure.

Research justifying consumer-driven refinement over automatic mutation:

- Evolved prompts outperform static ones by +10.6% on agent tasks, with 83.6%
  lower per-task cost. Evolution needs judgment, not blind automation
  ([ACE](https://arxiv.org/abs/2510.04618), Stanford/Microsoft, ICLR 2026).
- Reflective prompt evolution beats reinforcement learning by 6–20% using 35x
  fewer rollouts. Natural language reflection provides a richer learning signal
  than policy gradients
  ([GEPA](https://arxiv.org/abs/2507.19457), Jul 2025).
- Co-evolving strategy and solution simultaneously outperforms evolving either
  alone, maintaining effectiveness across model families
  ([arXiv:2512.09209](https://arxiv.org/abs/2512.09209), Dec 2025).
- Evolving the mutation operator alongside solutions escapes local optima where
  fixed optimizers get stuck
  ([Promptbreeder](https://proceedings.mlr.press/v235/fernando24a.html),
  ICML 2024).

### The Evidence Report

`formatEvidence()` is the critical bridge between the engine and whatever
produces refinement decisions. It returns a structured object containing all
computed signals (clusters, trait signals, suggestions, trends) as typed fields,
plus a pre-rendered markdown string for direct inclusion in LLM prompts or
human-readable views. Consumers that need programmatic access (dashboards,
automated pipelines) use the structured fields. Consumers that need a text
block (LLM refinement prompt) use the rendered string. One function, both
audiences. The more mechanical analysis it handles deterministically, the less
the LLM or human spends on pattern detection instead of judgment. The report
is pre-digested, not raw.

**Shard clustering.** Pending shards are grouped by lexical similarity using
FTS5 BM25 scores or in-memory trigram Jaccard. When called with `tags` or
`query` options, only matching shards enter the clustering pipeline — the
consumer scopes the report to a specific topic without post-filtering. For N
pending shards, pairwise trigram comparison on short texts (1–3 sentences) is
microseconds each. Single-linkage clustering at `clusteringThreshold` (default:
0.4 Jaccard) produces theme groups. Each cluster is annotated with:

- member count — the recurrence weight
- source diversity — unique sources divided by member count
- age span — days between oldest and newest shard in the cluster
- freshness — mean relevance across members, using exponential decay:
  `freshness = exp(-ageDays / shardRelevanceHalfLife)`,
  default `shardRelevanceHalfLife`: 60 days. Note: human forgetting follows a
  power law, not exponential
  ([Wixted & Ebbesen 1991](https://journals.sagepub.com/doi/10.1111/j.1467-9280.1991.tb00175.x)).
  For computational relevance ranking the distinction is immaterial — both
  monotonically weight recent over old. Exponential decay is used here as a
  standard engineering convention (EMA/discount factor), not as a model of
  human cognition.

Clusters are ranked by weight:

```text
clusterWeight = memberCount × sourceDiversity × avgFreshness
```

A 5-member, 3-source, recent cluster dominates. A stale singleton sinks. The
LLM sees highest-weight themes first and spends tokens on judgment, not
pattern detection.

**Shard-trait alignment.** For each cluster, the engine computes trigram Jaccard
between the cluster's representative shard (highest intra-cluster similarity)
and each active trait's principle text. Clusters that overlap strongly with a
trait are labeled `reinforcing trait #X` — confirming an existing principle.
Clusters with no trait overlap are labeled `novel` — potential new territory.
For 5 clusters and 10 traits, this is 50 trigram comparisons — microseconds.
This distinction saves the LLM from mechanical "is this new or existing?"
analysis during refinement.

**Trait signals.** Each active trait is annotated with derived metrics:

- **Tenure** — `(now - traitCreatedAt) / max(1, now - soulCreatedAt)`,
  normalized 0..1. High tenure means deeply established; a candidate for
  promotion during level-up.
- **Staleness** — `(now - max(createdAt, updatedAt)) > staleDays` (default: 90
  days). A trait that has not been revised and has no recent shard citations may
  be dead weight. Flagged for review, not automatically removed.
- **Citation count** — how many shards cite this trait. Well-evidenced traits
  have high counts.
- **Citation density** — `citationCount / max(1, traitAgeDays)`. Normalizes
  evidence volume by age. High density = actively reinforced. Low density after
  long tenure = weakly supported.
- **Essence redundancy** — trigram Jaccard between the trait principle and the
  soul's essence text. If `redundancy > redundancyThreshold` (default: 0.3),
  the trait is flagged as potentially already absorbed into the essence. This
  catches a common failure mode: a trait that duplicates a paragraph in the
  narrative, wasting a slot.
- **Survival count** — attunement events since trait creation, computed from
  `lastAttunedAt` timestamps. Traits that survive multiple refinement cycles
  without revision are demonstrating fitness through persistence. Research:
  survival rate as a fitness proxy in evolutionary algorithms
  ([Jiang & Gao, Complex & Intelligent Systems 2025](https://link.springer.com/article/10.1007/s40747-025-01822-y)).

**Consolidation suggestions** (when at capacity). Pairwise trigram Jaccard
between active trait principles. Pairs above `consolidationThreshold` (default:
0.3) are flagged as potential consolidation candidates. For 10 traits, this is
45 comparisons — microseconds. Surfaces in the report as "Traits #3 and #7
share significant overlap — consider consolidating."

**Tension detection.** Pairs with high lexical overlap AND negation asymmetry
(one contains "not", "never", "avoid", "without" where the other does not) are
flagged as potential contradictions. Negation is a reliable semantic signal in
textual entailment — NLI research confirms it is one of the strongest lexical
cues for contradiction, though models frequently over-rely on it as a shallow
heuristic
([TINA, EMNLP 2022 Findings](https://aclanthology.org/2022.findings-emnlp.301/)).
We deliberately use it as a shallow heuristic here — not semantic understanding
— so it will produce false positives. That is acceptable: the flag is a "look
at this" signal for the consumer, not a judgment. False positives cost one
glance; missed contradictions cost a confused identity.

**Promotion candidates.** Traits ranked by a composite score:

```text
promotionScore = tenure × citationDensity × essenceRedundancy
```

Traits that are old, well-evidenced, AND already partially echoed in the essence
are strong candidates for absorption into the narrative.

**Trend indicators.** Shard velocity over recent vs. previous windows:

```text
recentRate  = shards deposited in last 14 days
previousRate = shards deposited in the 14 days before that
velocity     = recentRate - previousRate
```

Positive velocity = accelerating observations, something is happening. Negative
= decelerating, soul is stabilizing. Zero = steady state. Source distribution
shift highlights whether new evidence channels have emerged.

**Suggested actions.** A deterministic summary list derived from all signals:
"3 traits flagged stale," "2 traits redundant with essence," "1 cluster (size 4)
not aligned with any trait," "soul at capacity — level-up recommended," "2 trait
pairs are consolidation candidates." The LLM or human reads the summary, drills
into whichever items need judgment, and skips the rest.

**What the engine cannot detect.** Whether a specific trait is making a soul
_better or worse_. That requires causal isolation between trait changes and
outcome shifts — a statistical problem that demands data volumes a personal-scale
system does not produce. The engine provides signals (health, trends, trait
staleness, citation density) that make regression _noticeable_. The consumer
provides the causal judgment about what to fix. Trait revert and level-up
rollback supply the recovery mechanism once the consumer decides.

**Cross-soul shard view.** Shards are linked N:M to souls via `shard_souls`.
When formatting evidence for soul A, the report includes a `sharedWith` field
for clusters where a significant portion of shards are also attributed to soul
B. This surfaces tension ("soul A and soul B are receiving overlapping signals
— consider whether this capability belongs to one or both") and overlap without
the consumer needing to run separate reports and diff them. Computed as a simple
set intersection on `shard_souls.soul_id` for the shards in each cluster.

The net effect: significantly fewer input tokens for the refinement call
compared to dumping raw shards into the prompt. Pre-digested clusters,
alignment labels, and suggested actions replace verbose observation lists —
analogous to how constraint compression improves compliance by reducing noise
([arXiv:2505.07591](https://arxiv.org/abs/2505.07591)). The LLM focuses on
judgment rather than mechanical pattern matching it is mediocre at.

### Rendering

`renderSoul(db, soulId, options?)` produces a markdown identity block in two
modes controlled by `includeProvenance` (default: `false`):

**Lean mode** (for system prompts):

```text
# Name
*description*

essence narrative

## Traits
- principle
- principle
```

**Full mode** (for human inspection, evidence reports, debug views):

```text
# Name
*description*

essence narrative

## Traits
- **principle** — provenance
- **principle** — provenance
```

Lean mode omits provenance entirely. A 10-trait soul with paragraph-length
provenance chains can easily cost 500+ tokens per turn. Lean rendering cuts
that to ~100 tokens for the trait section. The provenance is always available
via `getTrait` or full-mode rendering — it is not lost, just not repeated on
every turn.

The consumer places the rendered block into a system prompt. Pure text. The
consumer decides what else to compose around it — environment, tool guidance,
skill index, domain context. The package never touches prompt assembly beyond
its own identity block.

**Trait ordering.** Traits are ordered by citation density descending in the
rendered block. Research shows constraint compliance varies with position —
primacy and recency effects are 2.9x larger than semantic effects
([EACL 2026](https://aclanthology.org/2026.eacl-long.62/),
[arXiv:2512.17920](https://arxiv.org/abs/2512.17920)). The most-evidenced
traits occupy the primary position (top), where primacy bias maximizes
adherence. Recently added traits sit at the bottom, caught by recency. Weakly
evidenced traits land in the middle — the lowest-compliance position, where
low confidence matters least. This is just an `ORDER BY` in the render query.
Zero cost, potentially meaningful compliance improvement.

The rendered block is static by design — byte-identical between turns unless a
trait mutation or level-up changes it. This matters first for coherence, not
optimization: the identity block remains stable between explicit mutations, so
consumers can rely on it as a versioned artifact rather than a drifting prompt
fragment.

### Dormancy

`retireSoul` sets `deletedAt`. The soul's full history is preserved — traits,
levels, shards, citations all intact. `awakenSoul` clears `deletedAt` with an
optional rename and uniqueness check. A dormant soul can be awakened years later
with its complete evolutionary history.

Dormant souls do not appear in active listings or crystallization readiness
checks, but remain fully inspectable and restorable.

## The Memetic Algorithm

The package mechanics map precisely to a memetic evolutionary algorithm. Not
metaphorically — the structural correspondence is exact:

| Evolutionary Concept    | Souls Mechanic                                          |
| ----------------------- | ------------------------------------------------------- |
| Schema (Holland, 1975)  | Trait — cognitive building block that survives when fit |
| Crossover (Goldberg)    | Level-up consolidation — sub-patterns recombine         |
| Elitism                 | Essence — best patterns preserved in narrative form     |
| Steady-state mutation   | Trait addition — small, targeted between generations    |
| Island model            | Multiple souls evolving independently                   |
| Parsimony pressure      | Trait limit — prevents bloat past effectiveness ceiling |
| Memetic dual mode       | Trait-addition (local) + level-up (global)              |
| Cooperative coevolution | Shared shard attribution across souls                   |

The combination of local search (one trait at a time) and global restructuring
(level-up consolidation) is what makes memetic algorithms provably faster than
pure evolutionary approaches — polynomial time on structured problems where pure
evolution needs superpolynomial
([Memetic algorithm research](https://eprints.whiterose.ac.uk/id/eprint/162048/)).

Island models with migration achieve polynomial convergence where single-
population approaches need exponential time on separable problems. Each soul
evolving in its own domain converges orders of magnitude faster than one
generalist trying to cover everything
([Island Model research](https://hrcak.srce.hr/en/clanak/221148)).

Cooperative coevolutionary self-play is a documented exception to the No Free
Lunch theorem — genuine free lunches exist when agents cooperate to improve each
other. Shared shard attribution across souls is this mechanism: one observation
feeds multiple souls' evolution, and improvement in one reshapes the fitness
landscape for the other
([Coevolutionary free lunch](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20060007558.pdf)).

Each level-up resets the growth ceiling. Each generation starts from a stronger
base. The improvement compounds.

## Derived State

Computed at read time, never stored as status fields:

### Soul-Level

- `activeTraitCount` — current trait occupancy
- `atCapacity` — whether trait count has reached the configured limit
- `crystallizationReady` — whether all five gating conditions hold (including
  the 2+ distinct clusters requirement)
- `crystallizationPriority` — tiebreaking score for multi-soul scheduling
- `pendingShardCount` — unprocessed observations
- `shardCountsBySource` — breakdown by source for diversity inspection
- `health` — `(1 - avgStaleness) × (1 - traitCount / traitLimit) × min(1, pendingShardCount / crystallizationThreshold)`.
  Range 0–1. Combines average trait freshness (inverted staleness), capacity
  headroom (how far from the trait limit), and shard coverage (evidence
  availability). 0 = stale, full, no evidence. 1 = fresh traits, room to grow,
  plenty of evidence. Primarily a dashboard signal for humans.
- `levelHistory` — full snapshot chain of level-up events

### Trait-Level

- `tenure` — normalized age relative to soul age (0..1)
- `stale` — boolean flag when unchanged for `staleDays`
- `citationCount` — how many shards cite this trait
- `citationDensity` — citations normalized by trait age
- `essenceRedundancy` — trigram overlap with the soul's essence
- `survivalCount` — attunement cycles survived since creation

### Shard-Level (in evidence reports)

- `clusters` — pending shards grouped by lexical similarity
- `clusterWeight` — member count × source diversity × freshness per cluster
- `traitAlignment` — per-cluster label: reinforcing existing trait or novel

## Surfaces

### Read

- `getSoul(db, id)` — full soul record
- `getSoulByName(db, name)` — lookup by unique name
- `listSouls(db)` — all active souls as summaries
- `listDormantSouls(db)` — retired souls
- `renderSoul(db, id)` — markdown identity block (essence + active traits)
- `listTraits(db, soulId, options?)` — filtered by status, generation
- `getTrait(db, traitId)` — single trait record
- `countActiveTraits(db, soulId)` — current count
- `getTraitLimit(db)` — configured cap
- `getLevelHistory(db, soulId)` — level-up snapshots with before/after
- `listShards(db, soulId?, options?)` — pending shards, optionally per soul,
  filterable by source and tags
- `searchShards(db, query, options?)` — FTS5 full-text search across shard
  content, respects status and expiry filters
- `pendingShardCount(db, soulId)` — quick count
- `shardCountsPerSoul(db)` — overview across all souls
- `shardCountsByTag(db, soulId?)` — breakdown by tag for domain dashboards
- `crystallizationReadiness(db)` — which souls are ready for refinement
- `formatEvidence(db, soulId, options?)` — structured evidence report; options
  accept `tags` and `query` filters to scope the report to a topic subset

### Write

- `createSoul(db, input)` — register a new soul
- `updateSoul(db, id, input)` — update essence, name, or description
- `retireSoul(db, id)` — enter dormancy
- `awakenSoul(db, id, options?)` — restore from dormancy
- `addTrait(db, soulId, input)` — add a trait with principle and provenance
- `reviseTrait(db, traitId, input)` — update principle or provenance
- `revertTrait(db, traitId)` — soft-remove from active set
- `reactivateTrait(db, traitId)` — restore a non-active trait
- `levelUp(db, soulId, plan)` — execute a validated level-up plan
- `revertLevelUp(db, soulId)` — rollback the last level-up
- `dropShard(db, content, source, soulIds, tags?)` — deposit an observation
  with optional normalized tags; returns id + crystallization triggers
  transparently
- `dropShards(db, shards[])` — batch deposit for bootstrapping; runs one
  crystallization check at the end instead of per-shard
- `citeShard(db, shardId, traitId)` — link a shard to a trait
- `revealShards(db, shardIds)` — unseal deferred observations
- `stampAttuned(db, soulId)` — update the recency gate
- `fadeExhaustedShards(db)` — maintenance: fade over-cited shards

### Runtime

- `initSoulsTables(db)` — schema creation, idempotent

## Automation Boundary

### Deterministic (zero tokens)

- Citation fading (the one maintenance operation)
- Read-time expiry filtering (no deletion, just query exclusion)
- Shard content normalization on write (trim, collapse whitespace)
- Tag normalization on write (lowercase, trim, dedupe per shard)
- Crystallization readiness with cluster-based diversity gate and priority
  scoring
- Crystallization boundary notification on every `dropShard()`
- Trait limit enforcement and capacity checks
- Level-up plan validation with structured error diffs and advisory warnings
  (weak consolidations, premature promotions)
- Rendering in lean/full modes with citation-density trait ordering for
  positional compliance
- Dormancy transitions
- Recency gating via `lastAttunedAt`
- Shard clustering by lexical similarity in evidence reports (scopable by tags
  and FTS5 query)
- Cross-soul shard overlap detection in evidence reports
- Full-text shard search via FTS5
- Tag-based shard filtering and dashboard breakdowns
- Shard-trait alignment labeling (reinforcing vs. novel) via trigram Jaccard
- Trait tension detection (negation asymmetry heuristic)
- Trait signal computation (tenure, staleness, citation density, essence
  redundancy, survival count)
- Consolidation and promotion candidate suggestions
- Shard velocity and trend detection
- Suggested action summary in evidence reports

### Consumer-Provided (requires judgment)

- What observations to deposit as shards and from which sources
- When to trigger a refinement cycle beyond crystallization readiness
- What trait to propose, revise, or revert
- How to produce the level-up plan (LLM, human, scripted rule)
- Which souls to create and with what essences
- How to compose the rendered soul into a full system prompt
- When and how to run blocked training (one soul per cycle)

## Multi-Soul Context

The package provides building blocks for one soul's evolution. Consumers
typically run multiple souls — a coordinator, specialists, meta-souls — each
with its own identity and evolutionary trajectory. The research below explains
why focused per-soul evolution outperforms a single generalist:

- Tool selection accuracy does not degrade gradually; it falls off a cliff.
  Removing 80% of tools raised success from 80% to 100%, 3.5x faster, 37% fewer
  tokens ([Vercel](https://vercel.com/blog/we-removed-80-percent-of-our-agents-tools),
  Dec 2025). At 220 tools, the best model achieved only 62.3%
  ([MCP-Atlas](https://arxiv.org/abs/2602.00933), Jan 2026). Tool filtering
  yields 8–38% accuracy gains from reduced semantic ambiguity
  ([ToolScope](https://arxiv.org/abs/2510.20036), Oct 2025).

- Sub-agent isolation achieved 65% token reduction by keeping each specialist's
  context lean ([Context7](https://medium.com/codex/context7s-game-changing-architecture-redesign-how-sub-agents-slashed-token-usage-by-65-9dbd16d1a641),
  Feb 2026). Multi-agent setups outperform single-agent by over 90% on complex
  tasks with isolated context windows
  ([Anthropic Sub-Agents](https://docs.anthropic.com/en/docs/claude-code/sdk/subagents)).
  Context replay accounts for 40–50% of total token cost in production agents
  ([OpenClaw](https://openclawpulse.com/openclaw-api-cost-deep-dive/), 2026).

- Dynamic tool retrieval yields 95% per-step token reduction, 32% routing
  improvement, 70% cost reduction
  ([ITR](https://arxiv.org/abs/2602.17046), Feb 2026). Skill-aware routing to
  specialized agents yields 22.5% performance improvement
  ([SkillOrchestra](https://arxiv.org/abs/2602.19672), Feb 2026).

- Context compression reduces peak tokens by 26–54% while preserving
  performance; for smaller models, compression improves accuracy by up to 46%
  ([ACON](https://arxiv.org/abs/2510.00615), ICLR 2026).

- 14 unique multi-agent failure modes cluster into specification failures,
  inter-agent misalignment, and verification failures. Single-coordinator
  architecture eliminates the entire misalignment category
  ([arXiv:2503.13657](https://arxiv.org/abs/2503.13657), Mar 2025).
  Hierarchical coordination surpasses flat multi-agent collaboration
  ([TalkHier](https://arxiv.org/abs/2502.11098), Feb 2025).

- Version-controlled system instruction deltas yield 4–5x productivity gains
  ([Weight Shaping](https://openreview.net/pdf?id=2unHBbaor7), OpenReview 2025).
  Even small models (7–8B) can auto-discover their own behavioral principles,
  achieving +8–10% improvements rivaling human-curated constitutions
  ([STaPLe](https://arxiv.org/abs/2502.02573), NeurIPS 2025). Genetic algorithm
  prompt evolution achieves up to +25% on BIG-Bench Hard
  ([EvoPrompt](https://arxiv.org/abs/2309.08532), ICLR 2024).

The consistent finding: evolved prompts outperform static ones by +6–25%,
focused tool surfaces yield 8–38% accuracy gains, and delegation-first
architectures cut token costs by 50–65%. Each mechanism makes the others more
effective.

The package provides the evolution engine. The consumer decides the topology.

## Defaults and Knobs

### Core Lifecycle

| Knob                       | Default | Controls                                          |
| -------------------------- | ------- | ------------------------------------------------- |
| `traitLimit`               | 10      | active traits per soul before level-up is needed  |
| `crystallizationThreshold` | 3       | minimum pending shards for refinement eligibility |
| `shardExpiryDays`          | 120     | read-time cutoff for old shards                   |
| `shardFadeCitations`       | 2       | citations before a shard fades                    |

### Evidence Intelligence

| Knob                     | Default | Controls                                           |
| ------------------------ | ------- | -------------------------------------------------- |
| `shardRelevanceHalfLife` | 60      | days for shard freshness decay in report ordering  |
| `clusteringThreshold`    | 0.4     | trigram Jaccard for grouping shards into themes    |
| `staleDays`              | 90      | trait age before flagging as stale                 |
| `redundancyThreshold`    | 0.3     | essence-trait overlap detection threshold          |
| `consolidationThreshold` | 0.3     | trait-pair similarity for consolidation suggestion |

Source diversity (2+ distinct sources) and age spread (>1 day) for
crystallization are hardcoded research-backed invariants, not configurable.

The core lifecycle knobs gate when things happen. The evidence intelligence
knobs tune how transparently the engine pre-digests information for the
consumer. Both groups have sensible defaults that work without tuning.

## Complexity Budget

- Seven tables plus one FTS5 virtual table. One lifecycle. No graph queries.
- Valid shard writes are always accepted. Bounding is a read concern, never a
  write concern.
- Prefer derived reads over stored status flags.
- All intelligence in evidence reports is deterministic — trigram Jaccard, FTS5
  BM25, count-based thresholds, temporal signals. No heuristics that require
  tuning per deployment.
- The package does not call LLMs. The package does not know what souls exist
  until the consumer creates them.
- Shard source types are open strings, not an enum the package must maintain.
- Reject changes that turn Souls into a workflow engine, prompt template library,
  tool registry, or skill store.
- Reject changes that only become valuable after large-scale saturation.
- Require correctness without background jobs — maintenance is callable, not
  scheduled internally.

### Schema

```text
souls(
  id, name, slug, essence, description, level,
  created_at, updated_at, deleted_at, last_attuned_at
)

soul_traits(
  id, soul_id, principle, provenance, generation, status,
  merged_into, created_at, updated_at
)

soul_levels(
  id, soul_id, level, essence_before, essence_after,
  traits_consolidated, traits_promoted, traits_carried, traits_merged,
  created_at
)

soul_shards(
  id, content, source, status, sealed,
  created_at, updated_at
)

shard_souls(shard_id, soul_id)

shard_citations(shard_id, trait_id)

shard_tags(shard_id, tag)

-- FTS5 virtual table, auto-maintained by triggers
shard_fts(content) USING fts5(content=soul_shards, content_rowid=id)
```

Seven tables plus one FTS5 virtual table. The first three own identity and its
evolution. The next four own evidence and its lifecycle. The FTS5 table enables
lexical similarity for shard clustering and shard-trait alignment without
loading content into memory.

### Indexes

```text
idx_shards_pending ON soul_shards(status, sealed, created_at)
  WHERE status = 'pending'
idx_shard_souls_soul ON shard_souls(soul_id)
idx_shard_citations_shard ON shard_citations(shard_id)
idx_shard_citations_trait ON shard_citations(trait_id)
idx_shard_tags_shard ON shard_tags(shard_id)
idx_shard_tags_tag ON shard_tags(tag)
```

The partial index on `status = 'pending'` is the key optimization: reads only
scan the active shard pool regardless of total table size. Thousands of faded
and expired shards are invisible to indexed queries.

### Usage Regimes

**Cold start:** zero souls. Consumer creates whatever identities it needs.
All mechanics behave cleanly with zero data.

**Light use:** a few souls with occasional manually created shards. Even a
single-user workflow can satisfy the source-diversity invariant by separating
independent evidence channels — for example `manual_reflection`,
`manual_review`, and `reader_feedback`. Crystallization gates hold until
meaningful cross-channel evidence clusters form. No premature refinement.

**Steady use:** regular shard deposits from delegation, distillation, and
domain packages. Fading and read-time expiry keep the active pool focused.
Evidence reports surface clustered themes. Refinement happens when evidence
justifies it.

**Heavy use:** frequent shard deposits from high-throughput agent operations.
Thousands of total shards accumulate; partial indexes ensure reads touch only
the pending pool. Evidence report clustering compresses high-volume observation
streams into weighted themes. Recency gating prevents redundant refinement.
The engine stays fast regardless of volume.

## Composability

| Faculty    | Domain                   | Core Loop                               |
| ---------- | ------------------------ | --------------------------------------- |
| `questlog` | tasks and commitments    | plan, track, complete, reward           |
| `affinity` | people and relationships | meet, bond, interact, maintain          |
| `codex`    | beliefs and knowledge    | remember, recall, revise, process flags |
| `souls`    | cognitive identity       | observe, crystallize, refine, level up  |

Together they form a complete cognitive substrate. Each stays lean at the
storage layer. The composite provides genuine infrastructure for agents that
grow.

Souls is unique in the quartet: it is the only faculty whose output becomes the
system prompt. Questlog produces task state. Affinity produces relationship
state. Codex produces belief state. Souls produces the identity block that
shapes how all other state is interpreted. The rendering function is the bridge
between the evolution engine and the execution layer.

## Use Cases

The engine provides a single abstraction — identity that evolves from evidence
— that maps to any domain where behavior should improve from accumulated
observation. The consumer brings domain semantics. The engine provides
structure, gating, and audit.

### Domain Mapping

| Domain                | Soul is              | Shards are                             | Traits are             | Level-up is               |
| --------------------- | -------------------- | -------------------------------------- | ---------------------- | ------------------------- |
| LLM agents            | agent identity       | delegation outcomes, task observations | behavioral principles  | prompt restructuring      |
| Game NPCs             | NPC personality      | player interactions, story events      | character qualities    | growth milestone          |
| AI companions         | companion identity   | conversation observations              | personality facets     | relationship deepening    |
| Creative writing      | fictional character  | story events, reader feedback          | character traits       | act break / arc shift     |
| Brand voice           | brand identity       | audience feedback, market response     | voice guidelines       | rebrand / voice pivot     |
| Educational tutor     | teaching style       | student performance data               | pedagogical principles | curriculum restructuring  |
| Sales training        | seller persona       | interaction outcomes, objections       | negotiation techniques | strategy overhaul         |
| Generative simulation | simulated agent      | environmental observations             | behavioral rules       | personality restructuring |
| Code review           | reviewer style       | PR feedback, team reactions            | team preferences       | standards evolution       |
| Deliberation          | viewpoint / position | arguments, evidence                    | stance principles      | position consolidation    |

In every case: `dropShard` accumulates observations. Crystallization gates
refinement until evidence warrants it. Traits mutate with provenance. Level-up
consolidates when the identity outgrows its current form. The audit trail
documents why the identity changed, not just that it did.

### Why This Engine, Not Just a Bigger Model

Model size does not improve persona consistency. GPT-4.1 achieved the same
PersonaScore as LLaMA-3-8b across 200 personas and 10,000 questions — the
bottleneck is architectural, not parametric
([PersonaGym](https://arxiv.org/abs/2407.18416), EMNLP 2025). Persona drift
emerges within 8 conversation rounds and worsens with larger models
([arXiv:2412.00804](https://arxiv.org/abs/2412.00804)). The engine addresses
drift structurally: the rendered identity block is static between mutations,
produced from versioned data rather than accumulated context. It does not drift
because there is nothing to drift.

Research systems that auto-discover behavioral principles from interaction data
— STaPLe (+8–10%, [NeurIPS 2025](https://arxiv.org/abs/2502.02573)), EvolveR
(self-distillation into strategic principles,
[arXiv:2510.16079](https://arxiv.org/abs/2510.16079)), DEEPER (32.2%
prediction error reduction,
[ACL 2025](https://arxiv.org/abs/2502.11078)) — each build bespoke pipelines
for evidence accumulation, principle extraction, and iterative refinement. This
engine provides that pipeline as a reusable package.

## Standalone Scope

Souls owns cognitive identity and its evidence-backed evolution.

It does not own:

- beliefs and factual knowledge (`codex`)
- relationships and social understanding (`affinity`)
- tasks and temporal commitments (`questlog`)
- procedures and executable know-how (`skills`)
- timelines, episodes, or narrative history (`trail`)

### Integration Boundary

Souls is the evolution engine. Orchestration policy — which souls exist, which
packages they operate, when refinement runs, how rendered souls compose into
full prompts, which soul handles which delegation — is external. One consumer
might run six souls with a coordinator pattern. Another might run one soul for
a chatbot. The engine serves both without caring.

The package remains valid as a direct-code standalone system. The underlying
model does not depend on any specific agent framework or orchestration pattern.

### Reintegration Note

When extracted as a dedicated standalone package, the consuming orchestrator
uses the package directly instead of maintaining a parallel internal model. The
intended path:

- use the standalone Souls read and write surface as the source of truth
- keep orchestrator-side wrappers thin and policy-oriented
- preserve runtime assumptions: Node 24+, built-in `node:sqlite`, lean
  local-first data model
- treat mandatory soul definitions, bootstrap sequences, and delegation routing
  as orchestration policy, not core ontology

## Showcase Layers

Souls ships as a public read/write surface. Two showcase layers demonstrate
what can be built on top: a human-facing demo app and an LLM-facing
tool/soul kit. Neither layer adds to the core. Both compose the same
deterministic engine.

### Demo App — Soul Workshop

A local-first micro-app for soul inspection and guided evolution. RPG character
sheet aesthetic — warm parchment tones, structured panels, level badges, XP
bars.

#### Screens

**Roster.** All souls as character cards: name, level badge, trait count out of
limit displayed as an XP bar, shard readiness indicator, dormancy status. Cards
are sorted by crystallization readiness — souls that need attention float to the
top.

**Character Sheet.** Full soul detail: rendered essence in a prominent panel,
active traits listed with provenance as collapsible entries, level-up history as
a vertical timeline, pending shards grouped by source with age indicators. The
sheet IS the soul — reading it tells you exactly how this identity thinks and
how it got there.

**Refinement.** Guided improvement flow: evidence report displayed alongside the
current soul, proposed changes (add, revise, revert trait) with before/after
preview of the rendered identity block. The user makes one decision at a time
and sees the immediate effect on the rendered output. Confirm or discard.

**Level-Up Workshop.** The consolidation interface: active traits displayed as
draggable cards. Group related traits into consolidation clusters. Write the
merged principle for each group. Mark traits for promotion into the essence.
Preview the new essence with promoted knowledge woven in. Execute with full
snapshot. Visual transformation: the soul card updates level, traits rearrange,
the XP bar resets.

#### Visual Behavior

**XP bar as trait capacity.** Fills as active traits approach the limit. Gentle
pulse when at capacity — the soul is ready for level-up, not overstuffed.

**Shard accumulation.** Pending shards appear as small indicators around the
soul card, growing in number as observations accumulate. When crystallization
readiness is met, the indicators coalesce into a readiness signal.

**Level-up transformation.** After executing a level-up, the soul card animates:
level badge increments, consolidated traits visually merge, promoted traits flow
into the essence panel, the XP bar resets with the carried traits visible. A
brief moment of celebration for earned growth.

### LLM Layer — Tools, Skills, Soul

When wired into an agent framework, a dedicated soul operates the evolution
engine through thin tool wrappers over the same public read/write surface. The
exact tool set is determined during implementation — the goal is the smallest
number of tools that cover all verbs and queries without redundancy.

Skills encode procedures as markdown: how to produce trait proposals from
evidence, how to judge consolidation versus promotion versus carry, how to
produce a level-up plan, how to run a maintenance pass. Each skill composes the
available tools into a repeatable workflow the soul can follow without ad-hoc
reasoning about engine internals.

The refinement soul is recursive: it refines other souls and is itself subject
to the same evolution. Its own traits evolve from the quality of its refinement
decisions. The mutation operator is subject to its own mutation — escaping local
optima where fixed approaches get stuck
([Promptbreeder](https://proceedings.mlr.press/v235/fernando24a.html),
ICML 2024). This recursive self-improvement, bounded by the same provenance
gates and crystallization thresholds, is what closes the compounding loop.
