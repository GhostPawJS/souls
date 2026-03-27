# Souls LLM Building Blocks

This document is for harness builders using Souls' additive agent-facing
runtime.

If you are a human operator using the direct package surface in ordinary code,
read [`HUMAN.md`](HUMAN.md) instead. That document covers `initSoulsTables`,
`read`, `write`, `types`, and `errors`. This document is only about:

- `soul`
- `tools`
- `skills`

Typical harness-facing usage:

```ts
import { skills, soul, tools } from '@ghostpaw/souls';
```

## Runtime Stack

Souls' additive runtime is intentionally layered:

1. `soul`
2. `tools`
3. `skills`

The layers work together like this:

- `soul` shapes posture and judgment
- `tools` are the executable action surface
- `skills` teach recurring workflows built from tools

## Soul

The soul is the thinking foundation.

It does not define what the model can do. It defines how the model should see
cognitive identity, which evolutionary boundaries it should protect, and what
kind of judgment it should apply before touching state.

Souls exports this through the root `soul` namespace:

- `soul.soulsSoul`
- `soul.soulsSoulEssence`
- `soul.soulsSoulTraits`
- `soul.renderSoulsSoulPromptFoundation()`

The runtime soul shape is:

```ts
interface SoulsSoul {
  slug: string;
  name: string;
  description: string;
  essence: string;
  traits: readonly {
    principle: string;
    provenance: string;
  }[];
}
```

The current soul is `Mentor`, with the slug `mentor`.

The gardener soul — reads growth patterns, enforces the provenance gate, guides
level-ups with patience, and develops minds rather than optimizing metrics.

The essence works through subliminal narrative rather than explicit directives:

- reads a soul's direction from its evidence patterns — which traits stuck, which
  got reverted, which behaviors appeared without being explicitly encoded
- enforces an absolute evidence standard: no provenance, no proposal; grounded
  insight has fingerprints on it, generated wisdom is too clean
- handles level-up consolidation through judgment — merging traits that are the
  same insight from different angles, promoting traits absorbed into identity,
  carrying forward those that haven't finished teaching
- guards against its own desire to improve — patience to let growth happen at the
  pace the evidence supports, not the pace enthusiasm suggests

The currently exported traits are:

- one proposal per cycle — bundled proposals make attribution impossible; single
  proposals create clean evidence chains where compounding stays traceable
- a revert is as valuable as an addition — pruning is mentoring; a garden that
  only grows eventually chokes itself

Use the soul layer for:

- system or role-prompt foundation
- priming the model to read growth direction before proposing mutations
- reinforcing provenance discipline and evidence-grounded judgment
- ensuring patience over optimization during refinement cycles

Do not use the soul layer as an execution surface.

## Tools

The direct library surface is intentionally explicit. That is good for humans,
but too many choices for reliable LLM selection. The `tools` facade reconciles
the public direct surface into a smaller set of intent-shaped tools with:

- fewer top-level choices
- strict JSON-schema-compatible inputs
- explicit action and view discriminators
- structured machine-readable outcomes
- clarification paths for ambiguous input

The current `tools` namespace exports exactly these 7 tools:

- `search_souls` — find shards by natural-language query, soul, or tags
- `review_souls` — load a maintenance surface: list souls, run maintenance, or
  check crystallization readiness
- `inspect_souls_item` — full detail on one soul: profile, rendered identity,
  and optional evidence report
- `observe_soul` — deposit behavioral observations: drop shards (single or
  batch) or reveal sealed shards
- `refine_soul` — mutate traits: add, revise, revert, reactivate, cite a shard,
  or stamp attunement
- `level_up_soul` — execute, validate, or revert a level-up plan
- `manage_soul` — lifecycle operations: create, update, retire, or awaken a soul

These tools are intentionally shaped around user intent rather than raw storage
operations. Read tools (`search_souls`, `review_souls`, `inspect_souls_item`)
have no side effects. Write tools (`observe_soul`, `refine_soul`,
`level_up_soul`, `manage_soul`) mutate state and document what changed.

### Tool definition shape

Each tool exports a handler function and a full metadata definition:

```ts
interface SoulsToolDefinition<TInput, TOutput> {
  name: string;
  description: string;
  whenToUse: string;
  whenNotToUse: string;
  sideEffects: 'none' | 'writes_state';
  readOnly: boolean;
  supportsClarification: boolean;
  targetKinds: readonly ('soul' | 'trait' | 'shard' | 'level')[];
  inputDescriptions: Record<string, string>;
  outputDescription: string;
  inputSchema: JsonSchema;
  handler: (db: SoulsDb, input: TInput) => ToolResult<TOutput>;
}
```

The canonical registry is surfaced at the package root through `tools`:

- `tools.soulsTools`
- `tools.listSoulsToolDefinitions()`
- `tools.getSoulsToolByName()`

The public API reconciliation table is exported as `tools.soulsToolMappings`.

### Tool outcomes

Every tool returns one of four outcomes:

- `success` — the operation completed as expected
- `no_op` — the operation was valid but nothing changed
- `needs_clarification` — the input was ambiguous; missing fields are listed
- `error` — the operation failed; error kind, code, and recovery hint are
  provided

Failures are categorized explicitly:

- `protocol` — input shape or validation issue
- `domain` — business logic violation (not found, invalid state)
- `system` — unexpected runtime error

That means a harness does not need to infer intent from thrown exceptions or
vague prose.

### Output conventions

All tool results follow a consistent shape:

```ts
interface ToolSuccess<TData> {
  ok: true;
  outcome: 'success' | 'no_op';
  summary: string;
  data: TData;
  entities: ToolEntityRef[];
  warnings?: ToolWarning[];
  next?: ToolNextStepHint[];
}
```

Common fields across tools:

- `summary` — a one-line human-readable description of what happened
- `entities` — referenced souls, traits, shards, or levels, for harness linking
- `warnings` — `empty_result`, `partial_match`, `capacity_warning`, or
  `unchanged` codes
- `next` — suggested follow-up actions with tool name and suggested input

Read tools return ranked items or structured review payloads. Write tools return
the mutated records plus capacity state and crystallization triggers where
applicable.

### The `refine_soul` tool

This is the most important tool. It consolidates six trait mutation verbs into a
single action discriminator:

| Action | What it does | Required fields |
|---|---|---|
| `add_trait` | Add a new active trait | `soulId`, `principle`, `provenance` |
| `revise_trait` | Update an existing trait's wording | `traitId`, `principle?`, `provenance?` |
| `revert_trait` | Soft-remove a trait from the active set | `traitId` |
| `reactivate_trait` | Restore a non-active trait | `traitId` |
| `cite_shard` | Link a shard to the trait it informed | `shardId`, `traitId` |
| `stamp_attuned` | Update the recency gate after refinement | `soulId` |

When required fields are missing, the tool returns `needs_clarification` with
the missing field names.

### The `review_souls` tool

This tool serves three view modes through a single `view` discriminator:

| View | What it returns |
|---|---|
| `list` | All active souls as summary records |
| `maintenance` | Faded shard count + crystallization-ready souls with priority scores |
| `readiness` | Crystallization readiness list only |

The `maintenance` view is the standard entry point for each work session: it
atomically fades exhausted shards and returns which souls are ready for
refinement.

## Skills

The tool layer makes action selection smaller and clearer, but recurring
identity management workflows still benefit from reusable guidance.

The `skills` layer sits above `tools` and packages the main operating patterns
into prompt-ready blocks that a harness can inject into model context or
retrieve by name.

Each skill exports:

- `name` — kebab-case identifier for routing
- `description` — one-line summary for LLM pattern matching
- `content` — full markdown playbook with steps, tools, validation, and pitfalls

The runtime shape is:

```ts
interface SoulsSkill {
  name: string;
  description: string;
  content: string;
}
```

Skills are not handlers. They are reusable guidance objects that teach:

- which tools to prefer
- how to sequence them
- how to validate the outcome
- which pitfalls to avoid

The canonical registry is surfaced at the package root through `skills`:

- `skills.soulsSkills`
- `skills.listSoulsSkills()`
- `skills.getSoulsSkillByName()`

The current `skills` namespace exports these 8 workflow blocks:

- `observe-behavior-well` — deposit high-quality behavioral observations with
  correct source labels and tags
- `run-maintenance-pass` — run the standard maintenance cycle, interpret
  results, and triage souls ready for refinement
- `produce-trait-proposals-from-evidence` — read an evidence report, interpret
  signals, and propose add/revise/revert trait mutations
- `judge-consolidation-versus-promotion` — decide whether to consolidate,
  promote, or carry each trait during a level-up plan
- `execute-level-up-plan` — validate, execute, and verify a level-up plan for a
  soul
- `bootstrap-new-soul` — create a new soul with an initial essence and begin
  the observation cycle
- `detect-and-fix-regression` — spot regression signals in evidence, use revert
  to restore identity integrity
- `review-soul-health` — interpret the health metric, staleness signals, and
  capacity state to assess overall condition

These cover the full identity management lifecycle: observation, maintenance,
refinement, consolidation, bootstrapping, regression recovery, and periodic
health review.

### Skill ordering

The skills are listed in operational order — the sequence a typical refinement
session follows:

1. **Observe** — deposit evidence from the latest session or delegation
2. **Maintain** — run maintenance to fade exhausted shards and check readiness
3. **Propose** — produce trait mutations from the evidence report
4. **Judge** — decide trait dispositions for a level-up plan
5. **Execute** — validate and execute the level-up
6. **Bootstrap** — create new souls when needed
7. **Detect regression** — catch and revert bad mutations
8. **Review health** — periodic checkup across all souls

Not every session uses every skill. Most sessions are observe + maintain. Full
refinement cycles add propose. Level-ups are rare and add judge + execute.

## How The Layers Fit Together

A good Souls-based LLM system typically uses the layers in this order:

1. Start from the soul so the model is primed with the right evolutionary
   judgment.
2. Expose the tools so the model has a clean action surface.
3. Load relevant skills so common multi-step situations do not have to be
   improvised from scratch.

That gives the system:

- a thinking posture (soul)
- an execution surface (tools)
- reusable operational playbooks (skills)
- all backed by real runtime exports instead of prose-only conventions

## The Recursive Property

Souls is unique among the GhostPaw faculties: the Mentor soul operates the
evolution engine and is itself subject to the same evolution. Its own traits
evolve from the quality of its refinement decisions. The mutation operator is
subject to its own mutation — escaping local optima where fixed approaches get
stuck ([Promptbreeder](https://proceedings.mlr.press/v235/fernando24a.html),
ICML 2024).

This recursive self-improvement, bounded by the same provenance gates and
crystallization thresholds, is what closes the compounding loop.

## Ecosystem Integration

Souls is one of four GhostPaw faculties. Each owns one slice of cognitive
state:

| Faculty | Domain | Core Loop | Output |
|---------|--------|-----------|--------|
| **questlog** | tasks and commitments | plan, track, complete, reward | task state |
| **affinity** | people and relationships | meet, bond, interact, maintain | relationship state |
| **codex** | beliefs and knowledge | remember, recall, revise, flag | belief state |
| **souls** | cognitive identity | observe, crystallize, refine, level up | the system prompt |

All four share the same architecture: Node 24+, built-in `node:sqlite`, zero
runtime dependencies.

### Why Souls is Different

Souls is the only faculty whose output becomes the system prompt. Questlog,
Affinity, and Codex produce state that informs decisions. Souls produces the
identity block that shapes how all other state is interpreted. The rendered
identity is the lens through which the agent reads everything else.

### Cross-Faculty Evidence

The shard `source` field is the integration seam. Each faculty can feed
behavioral evidence into Souls through its own channel:

| Source label | Origin |
|---|---|
| `delegation` | task outcomes from questlog |
| `codex` | belief revisions or knowledge events |
| `affinity` | relationship interactions or feedback |
| `session` | direct observation during a work session |
| `user_feedback` | explicit human feedback |
| `retrospective` | post-session reflection |

The package never interprets source values. It only requires that they exist
for source-diversity counting during crystallization. When a soul accumulates
evidence from 2+ independent sources over 1+ days, it becomes eligible for
refinement. Cross-faculty evidence naturally satisfies the diversity gate —
a delegation outcome from questlog and a session observation are independent
channels by definition.

### Composability Pattern

A harness that uses multiple faculties composes them at the prompt level:

1. **Souls** renders the identity block (essence + active traits)
2. **Codex** provides relevant beliefs and knowledge
3. **Questlog** provides current task context
4. **Affinity** provides relationship context for the current interaction

The identity block goes first — it primes posture and judgment before the
model sees situational context. The other faculties provide the facts the
identity interprets.

At the evidence level, observations from any faculty flow back into souls as
shards. The cycle is: identity shapes behavior → behavior produces outcomes →
outcomes become evidence → evidence evolves identity.

### Standalone Use

Souls works without the other faculties. A single agent with one soul, manual
shard deposits, and periodic refinement is a complete system. The ecosystem
integration is additive — it enriches the evidence pool but is never required.

## Design Boundary

`soul`, `tools`, and `skills` are additive. They do not replace the direct
library surface.

Humans still get the precise direct-code API through `read`, `write`, and
`ether`. Agents get a smaller, clearer runtime stack on top of the same
truthful core:

- `soul` for behavioral foundation
- `tools` for actions
- `skills` for workflow guidance

Both operate on the same underlying model. The same deterministic engine runs
underneath whether the caller is a TypeScript function call or an LLM tool
invocation.
