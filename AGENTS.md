# Contributing to @ghostpaw/souls

Prompt evolution engine storing cognitive identity, traits, and behavioral evidence in SQLite.

## Use

Install with `npm install @ghostpaw/souls` in a consuming project (Node 24+).

```ts
import { DatabaseSync } from 'node:sqlite';
import { initSoulsTables, read, write } from '@ghostpaw/souls';

const db = new DatabaseSync(':memory:');
initSoulsTables(db);
const soul = write.createSoul(db, {
  name: 'Reviewer',
  essence: 'Read for intent before checking details.',
  description: 'Code review identity',
});
const prompt = read.renderSoul(db, soul.id);
db.close();
```

The `tools` namespace exports definitions and synchronous handlers from
`src/tools/`. `tools.listSoulsToolDefinitions()` lists definitions;
`tools.getSoulsToolByName('search_souls')?.handler(db, { query: 'Reviewer' })`
returns a result with `ok`, `outcome`, `summary`, and `entities`.
Successful results include `data`; other outcomes include `error` or
`clarification`. Optional `warnings` and `next` provide further guidance.

Only the ether catalog fetch uses the network. Core identity operations are local.

## Layout

- `src/index.ts`: public exports; `src/read.ts` and `src/write.ts`: core facades.
- `src/souls/`, `src/traits/`, `src/shards/`, `src/levels/`: domain operations.
- `src/ether/`: catalog registration, fetching, parsing, search, and manifestation.
- `src/tools/`, `src/skills/`, `src/soul.ts`: tool facade, procedures, built-in identity.
- `src/demo/`: browser demo; `docs/`: architecture and usage references.
- `scripts/`: build and verification scripts; `.github/workflows/`: CI and releases.

## Contribute

Use Node 24: `export PATH=/opt/node24/bin:$PATH` before commands.
Run the complete gate: `npm run lint && npm run typecheck && npm test && npm run build`.
Tests use `node:test` and `node:assert`, with `*.test.ts` beside the source.
Assert behavior and preserve existing assertions; do not skip tests or exclude coverage.
Use `npx biome check --write` on changed files when formatting is needed.
Maintain zero runtime dependencies; `npm run check:deps` verifies this policy.

Changes must be non-breaking and additive. Preserve exported symbols, signatures,
synchronous behavior, tool names and schemas, CLI flags, and database schemas.
Document changes under `Unreleased` in `CHANGELOG.md`.

Maintainer releases use `npm run release:patch` or `npm run release:minor`.
These scripts update the version and push commits and tags; tag CI verifies and
publishes the package with provenance. Leave review changes uncommitted and do
not run release, publish, push, or deployment commands during a quality sweep.
