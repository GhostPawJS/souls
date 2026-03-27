# @ghostpaw/souls — Human Developer Guide

> For human developers using the direct `read` / `write` / `ether` API.

If you are building an LLM harness with tools and skills, read
[`LLM.md`](LLM.md) instead. This document covers the direct package surface
for ordinary TypeScript code.

## Setup

```ts
import { DatabaseSync } from 'node:sqlite';
import { initSoulsTables, read, write } from '@ghostpaw/souls';

const db = new DatabaseSync('souls.db');
initSoulsTables(db);
```

`initSoulsTables` is idempotent — safe to call on every startup. It creates
seven tables plus one FTS5 virtual table if they don't exist.

The `db` handle is a `DatabaseSync` from Node 24's built-in `node:sqlite`.
Every function in `read` and `write` takes it as the first argument.

## Souls

### Create

```ts
const soul = write.createSoul(db, {
  name: 'Reviewer',
  essence: 'I review code by reading for intent before scanning for bugs.',
  description: 'Code review specialist',
  slug: 'reviewer', // optional machine-friendly alias
});
// soul.id, soul.level (starts at 1), soul.createdAt
```

Name must be unique among active souls. Essence is narrative prose — research
shows narrative backstories improve behavioral consistency by 18–27% over trait
enumerations.

### Query

```ts
const soul = read.getSoul(db, soulId);
const soul = read.getSoulByName(db, 'Reviewer');
const all = read.listSouls(db);          // active souls
const dormant = read.listDormantSouls(db); // retired souls
```

### Update

```ts
write.updateSoul(db, soulId, {
  name: 'Senior Reviewer',
  description: 'Updated description',
});
```

This is an administrative escape hatch. Updating `essence` directly bypasses
the evolutionary lifecycle — use it for bootstrapping or correcting errors,
not for routine refinement.

### Render

```ts
const markdown = read.renderSoul(db, soulId);
const verbose = read.renderSoul(db, soulId, { includeProvenance: true });
```

Returns the identity block as markdown: name, description, essence, and active
traits ordered by citation density (most-evidenced first for primacy
compliance). This is what goes into a system prompt.

In lean mode (default), traits are rendered as principles only. With
`includeProvenance: true`, each trait includes its evidence chain.

### Profile

```ts
const profile = read.getSoulProfile(db, soulId);
// profile.soul           — the SoulRecord
// profile.activeTraits   — current active traits
// profile.activeTraitCount
// profile.traitLimit     — default 10
// profile.atCapacity     — true when trait count >= limit
// profile.pendingShardCount
// profile.crystallizationReady — true when refinement is eligible
// profile.health         — 0..1 composite score
```

The health score combines trait freshness, capacity headroom, and evidence
availability into a single number. Higher means the soul is in better shape
for continued growth.

### Lifecycle

```ts
write.retireSoul(db, soulId);              // enter dormancy
write.awakenSoul(db, soulId);              // restore from dormancy
write.awakenSoul(db, soulId, { name: 'Reviewer v2' }); // awaken with new name
```

Dormancy preserves full history. A retired soul can be awakened at any time.

## Traits

### Add

```ts
const trait = write.addTrait(db, soulId, {
  principle: 'Read the PR description before the diff.',
  provenance: 'Reviews that started with code missed architectural intent 3 of 4 times.',
});
// trait.id, trait.generation, trait.status ('active')
```

Both `principle` and `provenance` are required. No provenance, no trait.

### Query

```ts
const active = read.listTraits(db, soulId, { status: 'active' });
const all = read.listTraits(db, soulId); // all statuses
const gen2 = read.listTraits(db, soulId, { generation: 2 });
const trait = read.getTrait(db, traitId);
const count = read.countActiveTraits(db, soulId);
const limit = read.getTraitLimit(); // default 10
```

### Revise

```ts
write.reviseTrait(db, traitId, {
  principle: 'Updated principle text',
  provenance: 'Updated evidence chain',
});
```

Either field can be omitted to keep its current value.

### Revert and Reactivate

```ts
write.revertTrait(db, traitId);       // soft-remove from active set
write.reactivateTrait(db, traitId);   // restore to active
```

Reverted traits preserve their full record for audit. Consolidated and
promoted traits can also be reactivated if the judgment was wrong.

### Status Lifecycle

| Status | Meaning | Reaches via |
|--------|---------|-------------|
| `active` | Live, rendered every turn | addTrait, reactivateTrait |
| `consolidated` | Merged into a richer trait during level-up | levelUp |
| `promoted` | Absorbed into the essence during level-up | levelUp |
| `reverted` | Removed from active set, record preserved | revertTrait |

## Shards

### Drop

```ts
const result = write.dropShard(db, {
  content: 'Reviewer caught a naming inconsistency by reading the RFC first.',
  source: 'session',
  soulIds: [soulId],
  tags: ['code-review', 'architecture'],   // optional
  sealed: false,                            // optional, default false
});
// result.shard                    — the inserted ShardRecord
// result.crystallizationTriggers  — soul IDs that crossed the threshold
```

Content is auto-normalized: trimmed, whitespace collapsed, punctuation noise
stripped. Tags are lowercased, trimmed, and deduplicated.

### Batch Drop

```ts
const result = write.dropShards(db, [
  { content: 'Obs 1', source: 'session', soulIds: [soulId] },
  { content: 'Obs 2', source: 'delegation', soulIds: [soulId] },
]);
// result.shards                   — array of ShardRecords
// result.crystallizationTriggers  — deduplicated soul IDs
```

Batch writes run in a single transaction. Fail-fast: if any shard is invalid,
nothing is written.

### Sealed Shards

```ts
const result = write.dropShard(db, {
  content: 'Deferred observation from a quest.',
  source: 'quest_turnin',
  soulIds: [soulId],
  sealed: true,
});

// Later, reveal them:
write.revealShards(db, [result.shard.id]);
```

Sealed shards are hidden from evidence reports and crystallization checks
until explicitly revealed.

### Cite

```ts
write.citeShard(db, shardId, traitId);
```

Links a shard to the trait it informed. When a shard accumulates enough
citations (default 2), it fades automatically during maintenance.

### Query

```ts
const shards = read.listShards(db, { soulId, source: 'session', limit: 50 });
const results = read.searchShards(db, 'naming inconsistency', { soulId });
const pending = read.pendingShardCount(db, soulId);
const bySource = read.shardCountsBySource(db, soulId);
const byTag = read.shardCountsByTag(db, soulId);
const perSoul = read.shardCountsPerSoul(db);
```

`searchShards` uses FTS5 full-text search with BM25 ranking.

### Source Labels

The `source` field is an open string representing an independent evidence
channel. Examples:

| Label | Origin |
|-------|--------|
| `session` | direct observation during a work session |
| `delegation` | task outcome from a sub-agent |
| `user_feedback` | explicit human feedback |
| `retrospective` | post-session reflection |
| `codex` | belief revision from the codex faculty |
| `affinity` | relationship interaction from the affinity faculty |

The package never interprets source values. It only uses them for
source-diversity counting during crystallization — evidence from 2+
independent channels is required before refinement.

## Maintenance

```ts
const result = read.runMaintenance(db);
// result.fadedShardCount  — shards that just faded (cited by 2+ traits)
// result.readySouls       — souls eligible for refinement
```

Maintenance is deterministic, sub-millisecond, and costs no tokens. Run it
frequently — before each refinement check, on every session start, or on a
schedule. Fades exhausted shards and returns crystallization readiness for all
active souls.

### Crystallization Readiness

```ts
const ready = read.crystallizationReadiness(db);
// Array of { soulId, pendingCount, sourceDiversity, ageSpreadDays,
//            clusterCount, priorityScore }
```

A soul becomes crystallization-ready when it has enough pending shards from
2+ distinct sources spanning 1+ days, with sufficient cluster diversity. The
`priorityScore` ranks which soul would benefit most from refinement.

## Evidence Reports

```ts
const report = read.formatEvidence(db, soulId);
// report.pendingCount
// report.clusters            — shards grouped by theme
// report.traitSignals        — per-trait health: tenure, citations, staleness
// report.tensions            — detected contradictions between traits
// report.consolidationSuggestions — trait pairs similar enough to merge
// report.promotionCandidates — traits ready to absorb into essence
// report.suggestedActions    — ranked list of recommended mutations
// report.shardVelocity       — shards per day
// report.renderedMarkdown    — the full report as readable markdown
```

The evidence report pre-digests the raw shard pool into actionable
intelligence. Clusters are weighted by source diversity and freshness.
Trait signals detect staleness and redundancy with the essence. All
thresholds are deterministic — trigram Jaccard, FTS5 BM25, count-based.

## Level-Up

### Validate a Plan

```ts
const { errors, warnings } = read.validateLevelUpPlan(db, soulId, plan);
// errors.missingTraitIds    — active traits not accounted for
// errors.duplicateTraitIds  — traits appearing in multiple groups
// errors.invalidTraitIds    — IDs that don't belong to this soul
// warnings                  — weak consolidation, premature promotion
```

A level-up plan must account for every active trait — consolidate, promote,
or carry. Validation catches missing or duplicated traits before execution.

### Execute

```ts
const plan = {
  newEssence: 'Rewritten essence with promoted knowledge woven in.',
  consolidations: [
    {
      sourceTraitIds: [traitA.id, traitB.id],
      mergedPrinciple: 'The deeper principle behind both.',
      mergedProvenance: 'Evidence from both original traits.',
    },
  ],
  promotedTraitIds: [traitC.id],
  carriedTraitIds: [traitD.id],
};

const result = write.levelUp(db, soulId, plan);
// result.level     — the new level number
// result.snapshot  — LevelRecord with before/after essence, trait dispositions
```

Level-up is atomic: essence rewrites, traits consolidate/promote/carry, a
snapshot records the full transformation with before/after state. The
generation counter increments.

### Revert

```ts
write.revertLevelUp(db, soulId);
```

Full rollback of the most recent level-up: essence restored, consolidated
traits un-merged, promoted traits un-promoted, level decremented. The snapshot
is preserved for audit.

### History

```ts
const levels = read.getLevelHistory(db, soulId);
// Array of LevelRecord: essenceBefore, essenceAfter, traits disposition
```

## Attunement

```ts
write.stampAttuned(db, soulId);
```

Updates the `lastAttunedAt` timestamp. This is the recency gate — it prevents
redundant refinement cycles on souls that were just refined.

## Ether — Soul Template Discovery

The `ether` namespace provides access to a searchable catalog of ~2,800 soul
templates from open-source prompt libraries. See
[entities/ETHER.md](entities/ETHER.md) for the full entity documentation.

```ts
import { ether } from '@ghostpaw/souls';

const etherDb = ether.open('ether.db');
ether.registerDefaults(etherDb);
await ether.refreshAll(etherDb);

const results = ether.search(etherDb, 'security architect');
const entry = ether.getEntry(etherDb, results[0].id);
const soul = ether.manifest(soulsDb, entry);
```

Sources are fetched lazily with ETag caching. Refresh is atomic — failed
fetches never erase existing data.

### Source Management

```ts
ether.registerSource(etherDb, {
  id: 'my-source',
  kind: 'json',
  url: 'https://example.com/prompts.json',
  label: 'My Prompt Library',
});

const sources = ether.listSources(etherDb);
ether.removeSource(etherDb, 'my-source');
```

### Manifest

```ts
const soul = ether.manifest(soulsDb, entry, {
  name: 'Custom Name',        // override entry name
  description: 'Custom desc', // override entry description
  slug: 'custom-slug',        // optional slug
});
```

`manifest` bridges ether entries into the main souls database using
`write.createSoul`. The entry's content becomes the soul's essence.

## Errors

```ts
import { errors } from '@ghostpaw/souls';

try {
  write.createSoul(db, { name: '', essence: 'test', description: 'test' });
} catch (err) {
  if (err instanceof errors.SoulsValidationError) {
    // invalid input
  }
  if (err instanceof errors.SoulsNotFoundError) {
    // entity not found
  }
  if (err instanceof errors.SoulsStateError) {
    // invalid state transition (e.g. retire an already-dormant soul)
  }
  if (errors.isSoulsError(err)) {
    // any souls error
  }
}
```

| Error | When |
|-------|------|
| `SoulsValidationError` | Empty name, empty provenance, invalid input |
| `SoulsNotFoundError` | Soul, trait, or shard ID doesn't exist |
| `SoulsStateError` | Invalid state transition |
| `SoulsError` | Base class for all of the above |

## Ecosystem

Souls is one of four GhostPaw faculties sharing the same architecture
(Node 24+, built-in `node:sqlite`, zero runtime dependencies):

| Faculty | Domain | Feeds shards via |
|---------|--------|------------------|
| **questlog** | tasks and commitments | `source: 'delegation'` |
| **affinity** | people and relationships | `source: 'affinity'` |
| **codex** | beliefs and knowledge | `source: 'codex'` |

Each faculty can deposit behavioral observations into souls as shards. The
cross-faculty evidence naturally satisfies the crystallization diversity gate.
Souls is the only faculty whose output — the rendered identity block — becomes
the system prompt.
