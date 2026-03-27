# `soul_traits`

## What It Is

`soul_traits` stores the cognitive principles that define how a soul behaves.

A trait is one behavioral rule plus the evidence chain proving it was earned:
a principle ("prefer specific observations over general summaries") and a
provenance ("derived from novel evidence cluster across session and delegation
sources, April 2026"). Traits are the primary lens through which shards are
interpreted and the adaptive layer that evolves between level-ups.

## Why It Exists

Monolithic prompt text treats identity as a single undifferentiated string.
When behavior needs to change, someone rewrites the whole thing. There is no
way to surgically add, revise, or remove one behavioral rule without touching
the rest.

Structuring identity as discrete, editable principles yields +10.9% F1 across
6 benchmarks versus monolithic prompt text
([ConstitutionalExperts](https://aclanthology.org/2024.acl-short.52/),
ACL 2024). Individual traits can be surgically mutated without side effects on
the others.

The `soul_traits` table exists so each soul has:

- an ordered set of active behavioral principles
- a provenance chain for every principle (why it exists)
- a lifecycle for each principle (active, consolidated, promoted, reverted)
- a generation marker (which soul level the trait was born at)
- the ability to revert or reactivate any trait without data loss

Every trait must have non-empty provenance. No provenance, no trait. Targeted
evidence feedback reliably improves quality through 12 iterations, while vague
"be better" feedback plateaus or reverses quality after 2–3 iterations. The
differentiator is feedback specificity
([arXiv:2509.06770](https://arxiv.org/abs/2509.06770)).

## How To Use It

Add a trait when evidence justifies a new behavioral principle:

- "this pattern emerged from multiple observation clusters"
- "this principle was confirmed across 2+ source channels"
- "this refinement decision has specific provenance"

Typical flow:

1. `read.formatEvidence(db, soulId)` — get the structured evidence report with
   clusters and trait signals.
2. `write.addTrait(db, soulId, { principle, provenance })` — attach the new
   principle.
3. `write.citeShard(db, shardId, traitId)` — link the shards that informed the
   trait.
4. `write.stampAttuned(db, soulId)` — update the recency gate.

Revise, revert, or reactivate traits as evidence accumulates:

- `write.reviseTrait(db, traitId, { principle?, provenance? })` — update the
  wording based on new evidence.
- `write.revertTrait(db, traitId)` — soft-remove from the active set when
  evidence shows regression.
- `write.reactivateTrait(db, traitId)` — restore a reverted, consolidated, or
  promoted trait if the judgment was wrong.

## Good Uses

- behavioral principles distilled from observation evidence
- cognitive rules that shape how an agent approaches problems
- character qualities for NPCs that evolve from player interactions
- voice guidelines for brand identity backed by audience feedback

## Do Not Use It For

- the stable narrative identity core — that is the soul's
  [essence](SOULS.md)
- raw behavioral observations — those are [shards](SHARDS.md)
- level-up snapshots and evolutionary history — those are
  [levels](LEVELS.md)
- procedural checklists or tool documentation — those are capabilities

Traits answer "what specific behavioral rules does this soul follow?" — not
"who is this soul?" (essence), "what was observed?" (shards), or "how did it
evolve?" (levels).

## Status Lifecycle

Every trait has exactly one `status`:

| Status | Meaning |
|---|---|
| `active` | Live and rendered in the identity block every turn |
| `consolidated` | Merged into a richer combined trait during level-up; `mergedInto` points to the successor |
| `promoted` | Absorbed into the essence narrative during level-up; the knowledge is now part of who the soul is |
| `reverted` | Surgically removed from the active set; full record preserved for audit and potential reactivation |

Transitions:

| From | To | Trigger |
|---|---|---|
| `active` | `consolidated` | `write.levelUp()` consolidation |
| `active` | `promoted` | `write.levelUp()` promotion |
| `active` | `reverted` | `write.revertTrait()` |
| `consolidated` | `active` | `write.reactivateTrait()` or `write.revertLevelUp()` |
| `promoted` | `active` | `write.reactivateTrait()` or `write.revertLevelUp()` |
| `reverted` | `active` | `write.reactivateTrait()` |

All non-active statuses are terminal under normal operation. Reactivation is the
error-correction mechanism for any status.

## Trait Limit and the Constraint Density Cliff

Each soul has a configurable cap on active traits (default: 10). This is not
arbitrary. Constraint adherence drops from 78% to 33% as system prompt rules
accumulate past 4 constraints, measured across 19 LLMs and 7 model families
([arXiv:2505.07591](https://arxiv.org/abs/2505.07591)). The limit prevents
stacking past the effectiveness ceiling.

The cap signals when restructuring is needed, not when to keep stacking. When
active traits approach the limit, the soul is ready to level up.

## Trait Signals

Each active trait is annotated with derived metrics at read time, surfaced in
evidence reports:

- **Tenure** — normalized age relative to soul age (0..1). High tenure means
  deeply established.
- **Staleness** — flagged when unchanged for `staleDays` (default: 90 days).
  A trait without recent shard citations may be dead weight.
- **Citation count** — how many shards cite this trait. Well-evidenced traits
  have high counts.
- **Citation density** — citations normalized by trait age. High density =
  actively reinforced. Low density after long tenure = weakly supported.
- **Essence redundancy** — trigram Jaccard overlap between the trait principle
  and the soul's essence text. Flags traits that duplicate the narrative.
- **Survival count** — refinement cycles survived since creation. Traits that
  persist across multiple attunement cycles are demonstrating fitness.

## Operator Notes

- Traits are ordered by citation density descending in the rendered identity
  block. The most-evidenced traits occupy the primary position.
- Adding a trait beyond the limit throws `SoulsStateError`. Level up first.
- Reverting a trait is not failure — it is the error-correction mechanism. An
  identity that can be reverted and repaired is more resilient than one that
  accumulates drift.
- Consolidated and promoted traits remain in the table with full audit history.
  Nothing is deleted.

## Related Tables

- [`souls`](SOULS.md): the identity record that owns the trait
- [`soul_shards`](SHARDS.md): evidence that informs and cites traits
- [`shard_citations`](SHARDS.md): junction linking shards to the traits they
  informed
- [`soul_levels`](LEVELS.md): level-up snapshots recording which traits were
  consolidated, promoted, or carried

## Public APIs

### Writes

- `write.addTrait(db, soulId, input)`: add a new active trait with principle and
  provenance. Enforces the trait limit.
- `write.reviseTrait(db, traitId, input)`: update principle or provenance.
- `write.revertTrait(db, traitId)`: soft-remove from active set. Audit trail
  preserved.
- `write.reactivateTrait(db, traitId)`: restore any non-active trait to `active`.

### Reads

- `read.getTrait(db, traitId)`: fetch by ID, or `undefined`.
- `read.listTraits(db, soulId, options?)`: all traits for a soul, filterable by
  status or generation.
- `read.countActiveTraits(db, soulId)`: current active trait count.
- `read.getTraitLimit(options?)`: configured cap (default 10).
