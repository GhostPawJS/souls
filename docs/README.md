# @ghostpaw/souls — Architecture

Souls stores cognitive identity in SQLite through the structural `SoulsDb`
interface (`exec`, `prepare`, and `close`). Call `initSoulsTables` on the
consumer's database before using the `read` and `write` facades. The package
has no runtime dependencies.

## Model and lifecycle

A soul contains narrative essence and a generation counter. Traits attach
principles and provenance to that identity. Shards record observations and
associate them with souls; evidence reports analyze their relevance, source
diversity, age, and similarity. Crystallization checks gate refinement on
converging evidence.

Level-up plans consolidate, promote, carry, or merge traits. Validation checks
the plan before mutations are applied. Level history records snapshots for
rollback. Rendering combines the essence and active traits into an identity
block; reads do not evolve the stored identity.

## Boundaries

- `src/read.ts` and `src/write.ts` expose queries and mutations implemented in
  `souls/`, `traits/`, `shards/`, and `levels/`.
- `src/with_transaction.ts` coordinates transactional mutations, including
  nested operations on a connection.
- `src/tools/` wraps domain operations with JSON Schema definitions and
  structured success, no-op, clarification, and error results.
- `src/skills/` contains named Markdown procedures; `src/soul.ts` provides
  the built-in Mentor identity and prompt rendering.
- `src/ether/` maintains a separate template catalog. Sources are registered,
  fetched with ETag support, parsed, and refreshed transactionally. Search
  results can be manifested into souls in the identity database. Only catalog
  fetching uses the network; HTTP transports load when fetching starts.
- The internal `src/ether/open_ether.ts` helper initializes catalog tables,
  sets a five-second busy timeout, and enables WAL for file-backed databases.
  It is not exported from the package entry point.
- `src/demo/` implements the browser demonstration and its catalog snapshot;
  the snapshot is not embedded in the library entry point.

See [HUMAN.md](HUMAN.md) for direct library usage, [LLM.md](LLM.md) for the
structured tool facade, and [entities/](entities/) for domain details.
