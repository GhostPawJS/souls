# `souls`

## What It Is

`souls` is the root identity table of Souls.

A soul is one cognitive identity: the narrative essence, evolutionary generation,
and lifecycle state of a single agent-like persona. Not a prompt template, not a
config block, not a profile card. How an agent — or persona, or role, or
specialist — thinks, judges, and approaches problems.

## Why It Exists

Most prompt engineering treats identity as a static string pasted into a system
message. When behavior needs to change, someone edits the string and hopes it
still works. There is no history, no evidence trail, no structured evolution.

Souls treats identity as a first-class evolving record. The `souls` table exists
so one record can hold:

- the narrative identity core (essence)
- the current evolutionary generation (level)
- lifecycle state (active vs dormant)
- the recency gate for refinement timing
- a stable anchor for traits, shards, and level-up history

Research shows narrative backstories improve behavioral consistency by 18–27%
over trait enumerations
([EMNLP 2024](https://aclanthology.org/2024.emnlp-main.723)). The essence is
written as narrative prose because a coherent story creates a cognitive frame the
model inhabits; a bullet list creates a checklist it intermittently consults.

## How To Use It

Create a soul when the operator wants to say:

- "this identity exists in my world"
- "I want its behavior to evolve from evidence"
- "it should render into a system prompt"

Typical flow:

1. `write.createSoul(db, { name, essence, description })` — register the
   identity.
2. `write.addTrait(db, soulId, { principle, provenance })` — attach initial
   cognitive principles.
3. `write.dropShard(db, { content, source, soulIds })` — deposit behavioral
   observations over time.
4. `read.getSoulProfile(db, soulId)` — check capacity, health, readiness.
5. `read.renderSoul(db, soulId)` — produce the markdown identity block for a
   system prompt.

## Good Uses

- an LLM agent's identity block (coordinator, specialist, reviewer)
- a game NPC's personality and growth model
- an AI companion's evolving persona
- a brand voice identity that evolves from audience feedback
- a teaching tutor's pedagogical style
- a fictional character in a generative writing system
- any entity whose behavior should improve from accumulated observation

## Do Not Use It For

- beliefs and factual knowledge — that belongs in Codex
- tasks and temporal commitments — that belongs in Questlog
- people and relationships — that belongs in Affinity
- tool documentation or procedural checklists — those are capabilities and
  skills, not identity
- configuration or routing rules — those are infrastructure, not cognition

Souls answer "who is this and how do they think?" — not "what do they know?",
"what needs doing?", "who do they know?", or "what tools do they have?"

## Lifecycle

A soul has two lifecycle states derived from `deleted_at`:

| State | Condition | Meaning |
|---|---|---|
| `active` | `deleted_at IS NULL` | Live record; participates in rendering, evidence, and refinement |
| `dormant` | `deleted_at IS NOT NULL` | Retired; excluded from active queries and crystallization |

Transitions:

| From | To | Trigger |
|---|---|---|
| `active` | `dormant` | `write.retireSoul()` |
| `dormant` | `active` | `write.awakenSoul()` |

Dormancy preserves the complete evolutionary history — traits, shards, levels,
citations all intact. A dormant soul can be awakened years later with its full
lineage.

## Essence and the VIGIL Principle

The essence is the stable identity core. It is protected from routine mutation:
single-trait additions do not touch it. Only a level-up event restructures the
essence through the evolutionary lifecycle, following the
[VIGIL](https://arxiv.org/abs/2512.07094) principle: the core identity block
stays stable while the adaptive section (traits) evolves.

`write.updateSoul()` can overwrite the essence directly as an administrative
escape hatch — bootstrapping, correcting a catastrophic error, or manual
intervention. It is not part of the refinement lifecycle and bypasses all
evolutionary mechanics.

## Rendering

`read.renderSoul()` produces a markdown identity block in two modes:

**Lean mode** (default, for system prompts): essence + trait principles only.
A 10-trait soul costs ~100 tokens for the trait section.

**Full mode** (`includeProvenance: true`): essence + traits with provenance.
For human inspection, evidence reports, and debug views.

Traits are ordered by citation density descending — the most-evidenced traits
occupy the primary position where primacy bias maximizes adherence. Research
shows constraint compliance varies with position, and primacy/recency effects
are 2.9x larger than semantic effects
([EACL 2026](https://aclanthology.org/2026.eacl-long.62/)).

## Operator Notes

- The essence is byte-identical between turns unless a trait mutation or level-up
  changes it. Consumers can rely on it as a versioned artifact.
- `lastAttunedAt` is the recency gate: a soul that was just refined will not
  re-enter crystallization readiness until new observations accumulate.
- `stampAttuned` should be called after each refinement cycle to update the gate.
- Multiple souls evolve independently (island model). The consumer decides the
  topology — one soul, six specialists, a coordinator pattern. The engine serves
  all configurations without caring.

## Related Tables

- [`soul_traits`](TRAITS.md): cognitive principles that define behavior
- [`soul_shards`](SHARDS.md): behavioral observations as evidence
- [`soul_levels`](LEVELS.md): level-up snapshots with before/after state

## Public APIs

### Writes

- `write.createSoul(db, input)`: register a new soul with name, essence, and
  description.
- `write.updateSoul(db, id, input)`: update name, essence, description, or slug.
  Administrative escape hatch — not part of the refinement lifecycle.
- `write.retireSoul(db, id)`: enter dormancy. Sets `deleted_at`. Full history
  preserved.
- `write.awakenSoul(db, id, options?)`: restore from dormancy with optional
  rename and uniqueness check.
- `write.stampAttuned(db, id)`: update `last_attuned_at` to now after a
  refinement cycle.

### Reads

- `read.getSoul(db, id)`: fetch by ID, or `undefined` if not found.
- `read.getSoulByName(db, name)`: fetch by unique name among active souls, or
  `undefined`.
- `read.listSouls(db)`: all active souls ordered by name.
- `read.listDormantSouls(db)`: all retired souls.
- `read.renderSoul(db, id, options?)`: markdown identity block with traits
  ordered by citation density.
- `read.getSoulProfile(db, id, options?)`: full state picture — record, active
  traits, capacity, health, crystallization readiness — in one call.
