# @ghostpaw/souls

Prompt evolution engine for cognitive identity. Stores identity as narrative
essence plus evidence-backed traits, with structured level-up,
crystallization-gated refinement, and full rollback. Not a prompt template
library. Not a configuration manager. An evolutionary algorithm for how agents
think.

Node 24+, built-in `node:sqlite`, zero runtime dependencies.

## Install

```bash
npm install @ghostpaw/souls
```

## Quick Start

```ts
import { DatabaseSync } from 'node:sqlite';
import { initSoulsTables, read, write } from '@ghostpaw/souls';

const db = new DatabaseSync(':memory:');
initSoulsTables(db);

const soul = write.createSoul(db, {
  name: 'Reviewer',
  essence: 'I review code by reading for intent before scanning for bugs.',
  description: 'Code review specialist',
});

write.addTrait(db, soul.id, {
  principle: 'Read the PR description before the diff.',
  provenance: 'Reviews that started with code missed architectural intent 3 of 4 times.',
});

write.dropShard(db, {
  content: 'Reviewer caught a naming inconsistency by reading the RFC first.',
  source: 'session',
  soulIds: [soul.id],
});

const rendered = read.renderSoul(db, soul.id);
```

## What It Does

A **soul** is one cognitive identity — not a prompt template, not a config
object. How an agent thinks, judges, and approaches problems.

A **trait** is a cognitive principle with provenance — evidence proving it was
earned, not invented.

A **shard** is a behavioral observation from any source, attributed to souls.
Shards accumulate silently. When enough evidence converges across independent
channels over time, the soul becomes eligible for refinement.

**Level-up** consolidates: merge overlapping traits, promote absorbed ones into
the essence, carry forward those still teaching. The identity restructures and
the generation counter increments.

The rendered identity block (essence + active traits) is static between
mutations — no drift, no context accumulation, no re-rendering overhead. It
does not drift because there is nothing to drift.

## API Surface

```ts
import { read, write, ether, soul, tools, skills } from '@ghostpaw/souls';
```

| Namespace | Purpose |
|-----------|---------|
| `read` | Queries — get souls, traits, shards, evidence reports, render identity blocks |
| `write` | Mutations — create souls, add/revise/revert traits, drop shards, level up |
| `ether` | Soul template discovery — search ~2,800 open-source prompts, manifest as souls |
| `soul` | The built-in Mentor soul — gardener identity for guiding refinement |
| `tools` | LLM tool facade — JSON Schema definitions for agent framework integration |
| `skills` | Markdown procedures — crystallization, refinement, level-up, maintenance workflows |

### Core Lifecycle

```
observe → crystallize → refine → level up → repeat
```

Shards accumulate from any source. Crystallization gates refinement until
evidence converges across 2+ independent channels over 1+ days. Traits mutate
with provenance. Level-up restructures when the identity outgrows its current
form.

### The Mentor

The package ships one built-in soul — the Mentor — tuned for guiding the
entire refinement lifecycle:

```ts
import { soul } from '@ghostpaw/souls';

const systemPrompt = soul.renderSoulsSoulPromptFoundation();
```

### Ether — Template Discovery

Browse and search a catalog of open-source system prompts, then manifest them
as fully-formed souls:

```ts
import { ether } from '@ghostpaw/souls';

const etherDb = ether.open('ether.db');
ether.registerDefaults(etherDb);
await ether.refreshAll(etherDb);

const results = ether.search(etherDb, 'security architect');
const newSoul = ether.manifest(soulsDb, results[0]);
```

Sources are fetched lazily with ETag caching. Refresh is atomic — failed
fetches never erase existing data.

### LLM Tools

Wire into any agent framework via JSON Schema tool definitions:

```ts
import { tools } from '@ghostpaw/souls';

const allTools = tools.allToolDefinitions();
const result = tools.executeTool(db, toolName, args);
```

## Ecosystem

Souls is one of four faculties in the GhostPaw cognitive substrate:

| Faculty | Domain | Core Loop |
|---------|--------|-----------|
| **questlog** | tasks and commitments | plan, track, complete, reward |
| **affinity** | people and relationships | meet, bond, interact, maintain |
| **codex** | beliefs and knowledge | remember, recall, revise, flag |
| **souls** | cognitive identity | observe, crystallize, refine, level up |

Each faculty owns one slice of state. Each stays lean at the storage layer
with the same architecture: Node 24+, built-in `node:sqlite`, zero runtime
dependencies.

Souls is unique in the quartet: it is the only faculty whose output becomes
the system prompt. Questlog produces task state. Affinity produces relationship
state. Codex produces belief state. Souls produces the identity block that
shapes how all other state is interpreted.

Together they form a complete cognitive substrate for agents that grow.

## Domain Mapping

The engine provides a single abstraction — identity that evolves from
evidence — that maps to any domain where behavior should improve from
observation:

| Domain | Soul is | Traits are |
|--------|---------|------------|
| LLM agents | agent identity | behavioral principles |
| Game NPCs | NPC personality | character qualities |
| AI companions | companion identity | personality facets |
| Creative writing | fictional character | character traits |
| Brand voice | brand identity | voice guidelines |
| Educational tutor | teaching style | pedagogical principles |
| Code review | reviewer style | team preferences |

## Demo

An interactive local-first demo app with RPG character sheet aesthetics:

```bash
npm run demo:ether   # fetch template catalog
npm run demo:serve   # build and serve at localhost:7777
```

## Docs

| Document | Audience |
|----------|----------|
| [CONCEPT.md](CONCEPT.md) | Full design rationale, research citations, invariants |
| [docs/LLM.md](docs/LLM.md) | LLM harness builders — tool surface, rendering, soul layer |
| [docs/HUMAN.md](docs/HUMAN.md) | Human developers — direct read/write/ether API |
| [docs/PAGES.md](docs/PAGES.md) | Demo app pages, architecture, development |
| [docs/entities/](docs/entities/) | Entity deep-dives: souls, traits, shards, levels, ether |

## License

MIT
