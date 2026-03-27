# `soul_levels`

## What It Is

`soul_levels` records each level-up event as an immutable snapshot.

A level-up is a consolidation event: when traits approach capacity, the soul
restructures. Related traits merge into richer combined principles. Well-
established traits promote into the essence narrative. The remaining traits
carry forward unchanged. The new essence replaces the old. The level increments.
The full before/after state is preserved.

## Why It Exists

Most prompt systems have no concept of structured evolution. When identity
outgrows its current form, someone rewrites the whole thing. There is no record
of what changed, why, or how to undo it.

Souls treats restructuring as a first-class atomic operation with full rollback.
The `soul_levels` table exists so:

- every level-up is recorded as an immutable snapshot
- the previous essence and the new essence are both preserved
- every trait disposition (consolidated, promoted, carried, merged) is tracked
  by ID
- any level-up can be inspected, audited, and reversed

Research:

- Restructuring the optimization trace yields +4.7% over state-of-the-art at
  25% of the prompt generation budget. Level-up consolidation is this mechanism
  ([GRACE](https://arxiv.org/abs/2509.23387)).
- Memetic algorithms (local search + global restructuring) achieve exponential
  speedup over pure evolutionary approaches on structured problems
  ([Memetic algorithm research](https://eprints.whiterose.ac.uk/id/eprint/162048/)).

## How To Use It

Level up when a soul approaches trait capacity and crystallization is ready:

- "traits are near the limit and evidence has crystallized"
- "related traits should be consolidated into richer principles"
- "well-established traits should be absorbed into the essence"

Typical flow:

1. `read.getSoulProfile(db, soulId)` — check `atCapacity` and
   `crystallizationReady`.
2. `read.formatEvidence(db, soulId, { includeProvenance: true })` — get trait
   signals, consolidation suggestions, and promotion candidates.
3. Construct a `LevelUpPlan`: assign every active trait to consolidation,
   promotion, or carry. Draft a new essence.
4. `read.validateLevelUpPlan(db, soulId, plan)` — check for missing, duplicate,
   or invalid trait IDs.
5. `write.levelUp(db, soulId, plan)` — execute the plan atomically.
6. `read.getSoulProfile(db, soulId)` — verify the new state.
7. `write.stampAttuned(db, soulId)` — reset the recency baseline.

## Good Uses

- consolidating three error-handling traits into one "how you approach failure"
  mastery
- promoting a well-established communication trait into the narrative essence
- restructuring a soul that has hit its trait limit after sustained observation
- evolving an NPC's personality after a major story arc

## Do Not Use It For

- adding or revising individual traits — use
  [`write.addTrait`](TRAITS.md) or [`write.reviseTrait`](TRAITS.md)
- depositing observations — use [`write.dropShard`](SHARDS.md)
- routine maintenance — use `read.runMaintenance`
- administrative edits to the essence — use `write.updateSoul`

Level-ups answer "how did this soul restructure its identity?" — not "what
individual change was made?" (trait mutations), "what was observed?" (shards),
or "what is the current state?" (soul profile).

## The Level-Up Plan

A `LevelUpPlan` must account for every active trait exactly once across three
dispositions:

```typescript
interface LevelUpPlan {
  newEssence: string;
  consolidations: ConsolidationGroup[];
  promotedTraitIds: number[];
  carriedTraitIds: number[];
}

interface ConsolidationGroup {
  sourceTraitIds: number[];
  mergedPrinciple: string;
  mergedProvenance: string;
}
```

**Consolidation**: groups of related traits are merged into a single richer
principle. The source traits move to `consolidated` status with `mergedInto`
pointing to the new merged trait. A new `active` trait is created.

**Promotion**: traits that are old, well-evidenced, and already echoed in the
essence are absorbed into the narrative. They move to `promoted` status and no
longer occupy a trait slot.

**Carry**: traits that are distinct and actively relevant survive unchanged,
with their generation bumped to the new level.

## Validation

`read.validateLevelUpPlan()` enforces completeness before execution. On failure,
the error includes a structured diff:

- `missingTraitIds` — active traits not included in any disposition
- `duplicateTraitIds` — traits appearing in multiple dispositions
- `invalidTraitIds` — IDs that are not active traits for this soul

The plan must also include a non-empty `newEssence`. An empty essence throws
`SoulsValidationError`.

## Revert

`write.revertLevelUp()` performs a full rollback of the last level-up:

1. Reactivates all consolidated traits and clears `mergedInto`
2. Deletes the merged traits created during the level-up
3. Reactivates all promoted traits
4. Restores the previous generation on carried traits
5. Restores the previous essence and decrements the level
6. Removes the level-up snapshot
7. Re-unfades shards that drop below the fade threshold after citation deletion

The revert is atomic. The soul returns to its exact pre-level-up state.

## Operator Notes

- A soul at level 1 has no level-up history. Attempting to revert throws
  `SoulsStateError`.
- Level-up is the only mechanism that restructures the essence through the
  evolutionary lifecycle. `updateSoul` is the administrative bypass.
- The snapshot preserves `essenceBefore` and `essenceAfter` for every level-up,
  enabling full audit of identity evolution over time.
- After a level-up, the trait count decreases (consolidated and promoted traits
  are no longer active), creating room for the next generation of evidence-
  backed principles.

## Related Tables

- [`souls`](SOULS.md): the identity record whose essence and level are modified
- [`soul_traits`](TRAITS.md): traits that are consolidated, promoted, carried,
  or merged during the level-up
- [`soul_shards`](SHARDS.md): evidence that drove the level-up decision;
  citations to merged traits are cleaned up on revert

## Public APIs

### Writes

- `write.levelUp(db, soulId, plan)`: execute a validated level-up plan. Creates
  merged traits, updates statuses, replaces essence, bumps level, records
  snapshot.
- `write.revertLevelUp(db, soulId)`: full rollback of the last level-up.
  Restores essence, reactivates traits, deletes merged rows, removes snapshot.

### Reads

- `read.getLevelHistory(db, soulId)`: all level-up snapshots ordered by level
  ascending.
- `read.validateLevelUpPlan(db, soulId, plan)`: validate a plan before
  execution. Returns structured errors for missing, duplicate, or invalid trait
  IDs.
