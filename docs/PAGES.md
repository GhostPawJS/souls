# Interactive Demo

An interactive browser-based SPA that lets you explore Souls without
installing anything. The entire library runs client-side against an in-memory
SQLite database via sql.js-fts5 (WebAssembly).

**Live:** <https://ghostpawjs.github.io/souls>

## What It Covers

| Page | Route | Description |
| --- | --- | --- |
| Roster | `/` | Soul cards sorted by crystallization readiness, dormancy |
| Character Sheet | `/soul/:id` | Full identity, traits, health, shards, level history |
| Observation Lab | `/observe` | Deposit behavioral shards with source and attribution |
| Refinement | `/soul/:id/refine` | Evidence report, trait mutations, live identity preview |
| Level-Up Workshop | `/soul/:id/levelup` | Crystallization gate, trait disposition, execute/revert |
| Maintenance | `/maintenance` | Run maintenance pass, view ready souls |
| Search | `/search` | FTS5 full-text search across all shard content |
| Create Soul | `/create` | Bootstrap a new soul with name, essence, description |
| The Ether | `/ether` | Search ~2,800 soul templates from open-source prompt libraries |
| Ether Detail | `/ether/:id` | Inspect a template's full system prompt and manifest as a soul |

The demo ships with a rich seed scenario ("The Atelier") that populates all
entity types, lifecycle states, and evolution history. You can also reset to
a blank database and build your own scenario.

The Ether page provides access to ~2,800 soul templates from two open-source
prompt libraries (Awesome ChatGPT Prompts and the Rosehill System Prompt
Library). Templates are loaded from a build-time JSON dump into a second
in-memory sql.js-fts5 database, giving real FTS5 search with zero network
requests. Any template can be manifested as a living soul with one click.

## How It Works

```
sql.js-fts5 WASM  →  BrowserSoulsDb adapter  →  Souls library code  →  Preact SPA
```

A thin `BrowserSoulsDb` class implements the `SoulsDb` shape
(`exec`, `prepare` → `run`/`get`/`all`) over sql.js. The entire Souls
library — including all read/write operations, FTS5 search, and
crystallization logic — runs unmodified in the browser.

Seed data is inserted through the same write surface that LLM agents
would use, proving the library works end-to-end.

The Ether uses a **second** in-memory sql.js-fts5 database, separate from
the main souls database. A build-time script (`scripts/prepare_ether_dump.mjs`)
fetches the two source collections and produces a static JSON dump
(`src/demo/ether_dump.json`) that esbuild bundles. At runtime, the dump is
bulk-inserted and FTS-indexed on first access. The manifest action bridges
between the two databases — reading from the ether DB and writing to the
souls DB via `createSoul()`.

## Architecture

- **UI framework:** Preact (3 KB gzipped)
- **Database:** sql.js-fts5 (SQLite compiled to WebAssembly with FTS5)
- **Bundler:** esbuild (single ESM bundle, CSS inlined in HTML shell)
- **Routing:** Hash-based (`location.hash`)
- **State:** Preact context with a revision counter for reactive re-renders
- **Styling:** Cyberpunk-futuristic dark theme with purple accent, system fonts only
- **Assets:** Zero external loads — no CDN fonts, no icon libraries, no images

## Self-Explanatory System

Every page includes an `<Explainer>` banner that teaches the concept in
context (16 placements total). Every write action produces an annotation
toast with specific numbers and entity names. Every metric has an inline
contextual label. The app is designed to be usable without reading any
documentation.

## Seed Scenario — The Atelier

Four souls representing an AI development studio:

- **Architect** (Level 3, 7 active traits, crystallization-ready)
- **Delegate** (Level 2, 5 active traits, mid-cycle)
- **Scribe** (Level 1, 3 active traits, fresh)
- **Sentinel** (dormant, Level 2, retired)

The scenario demonstrates the full lifecycle: trait evolution through
multiple level-ups, consolidation/promotion history, pending shards
from diverse sources, stale traits, dormancy, and crystallization
readiness.

## Local Development

```bash
npm run demo:build     # Build once → demo/
npm run demo:watch     # Rebuild on changes
npm run demo:serve     # Build + serve at http://localhost:4173
npm run demo:ether     # Refresh the ether JSON dump from remote sources
```

## Deployment

The demo auto-deploys to GitHub Pages on every push to `main` via
`.github/workflows/pages.yml`. The workflow:

1. Installs dependencies
2. Runs `npm run demo:build`
3. Uploads the `demo/` directory as a Pages artifact
4. Deploys via `actions/deploy-pages@v4`
