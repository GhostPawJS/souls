# `ether`

## What It Is

`ether` is the soul template discovery module of Souls.

In ancient philosophy, the ether is the fifth element — the luminous substance
filling the heavens where spirits dwell before manifesting in the physical world.
In @ghostpaw/souls, the ether is where unmanifested soul templates reside,
waiting to be searched, discovered, and manifested into living souls.

The ether manages a **separate** SQLite database file — a disposable cache of
remote prompt/persona collections with FTS5 search and a one-call `manifest()`
bridge into the main souls system.

## Why It Exists

Bootstrapping a new soul requires writing an essence paragraph, a description,
and optionally initial traits. For operators who want to start from existing
system prompts rather than a blank page, the ether provides instant access to
thousands of curated prompt templates from open-source libraries.

The ether exists so:

- soul templates from external sources can be discovered without leaving the
  Souls workflow
- remote collections are fetched lazily and cached locally with FTS5 for
  instant keyword search
- a single `manifest()` call bridges the gap between a template and a living
  soul
- the cache is disposable — it can be rebuilt at any time without affecting the
  main souls database
- refreshes are atomic and robust — a failed fetch never erases existing data

## How To Use It

```ts
import { ether } from '@ghostpaw/souls';

// Open the ether (creates DB + tables on first call)
const etherDb = ether.open('~/.ghostpaw/ether.db');

// Register the built-in sources
ether.registerDefaults(etherDb);

// Fetch remote data (async — reaches into the ether)
await ether.refreshAll(etherDb);

// Search (sync — instant FTS5)
const results = ether.search(etherDb, 'security architect');

// Inspect a specific entry
const entry = ether.getEntry(etherDb, results[0].id);

// Manifest into a living soul in the main DB
const soul = ether.manifest(soulsDb, entry);
```

## Good Uses

- discovering existing system prompts to bootstrap new souls from
- searching across thousands of prompt templates by keyword
- rapid prototyping — manifest a template, then refine it through the
  observation/evidence cycle
- exploring what kinds of agent personas exist in the open-source ecosystem
- batch-importing prompts from curated collections

## Do Not Use It For

- storing your own souls — those belong in the main
  [`souls`](SOULS.md) table
- behavioral observations — those are [shards](SHARDS.md)
- cognitive principles — those are [traits](TRAITS.md)
- anything that needs to persist reliably — the ether DB is a disposable cache

The ether answers "what soul templates exist out there?" — not "who are my
souls?" (souls), "what was observed?" (shards), or "what rules do they follow?"
(traits).

## Architecture

The ether is a fully separate SQLite database from the main souls database.
This separation is intentional:

- The ether DB can be deleted and rebuilt without affecting any souls
- Refresh operations are isolated — network failures or parse errors never
  touch soul data
- The ether uses its own table namespace (`ether_sources`, `ether_entries`,
  `ether_fts`)
- The only bridge is `manifest()`, which calls `createSoul()` on the main DB

## Sources

A source is a remote collection of prompt templates. Each source has:

- **id** — stable identifier (e.g. `awesome-chatgpt-prompts`)
- **kind** — parser type: `github-csv` or `github-json`
- **url** — raw file URL for a single-file fetch
- **label** — human-readable name

Two sources are built in:

| Source | Kind | Entries | Description |
|---|---|---|---|
| `awesome-chatgpt-prompts` | `github-csv` | ~1,500 | Community-curated prompt collection from [f/awesome-chatgpt-prompts](https://github.com/f/awesome-chatgpt-prompts) |
| `rosehill-system-prompts` | `github-json` | ~1,250 | Structured agent library from [danielrosehill/System-Prompt-Library](https://github.com/danielrosehill/System-Prompt-Library) |

Custom sources can be registered with `ether.register()`.

## Schema

```sql
CREATE TABLE ether_sources (
    id              TEXT PRIMARY KEY,
    kind            TEXT NOT NULL,
    url             TEXT NOT NULL,
    label           TEXT NOT NULL,
    etag            TEXT,
    last_fetched_at INTEGER,
    entry_count     INTEGER DEFAULT 0
) STRICT;

CREATE TABLE ether_entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id   TEXT NOT NULL REFERENCES ether_sources(id),
    external_id TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    content     TEXT NOT NULL,
    category    TEXT,
    tags        TEXT,
    metadata    TEXT,
    fetched_at  INTEGER NOT NULL,
    UNIQUE(source_id, external_id)
) STRICT;

CREATE VIRTUAL TABLE ether_fts USING fts5(
    name, description, content, tags,
    content='ether_entries', content_rowid='id'
);
```

The FTS index is rebuilt after each source refresh — no triggers needed.

## Robust Refresh

Per-source atomic refresh:

1. HTTP GET with `If-None-Match: <stored etag>` (skip on 304)
2. Parse the full response into memory
3. `BEGIN TRANSACTION` → delete old entries for source → insert new →
   FTS rebuild → update source metadata → `COMMIT`

Fetch failure = no DB writes. Transaction failure = rollback. One source
failing never affects others. Existing data is always preserved until new
data is fully parsed and validated.

## Search

`ether.search()` uses FTS5 MATCH with BM25 ranking for relevance-ordered
results. Optional filters narrow by `sourceId`, `category`, or `limit`
(default: 50). A LIKE fallback activates if FTS5 encounters an error.

## Manifest Bridge

`ether.manifest()` creates a soul from an ether entry:

| Ether field | Soul field | Notes |
|---|---|---|
| `entry.name` | `name` | Overridable via options |
| `entry.content` | `essence` | The system prompt becomes the soul's identity |
| `entry.description` | `description` | Overridable; falls back to first 200 chars of content if empty |

Calls existing `createSoul()` from the write surface — full validation, no SQL
duplication. The manifested soul is immediately a first-class citizen with all
the evolutionary mechanics available.

## HTTP Fetcher

Uses `node:https` only. Zero external dependencies. Follows redirects (up to 5).
Sends `User-Agent` and `If-None-Match` headers. Configurable timeout (default
30s). Returns `{ body, etag, status }`. Throws `EtherFetchError` on failure.

## Parsers

- **CSV parser** (`parse_csv_source.ts`): State-machine CSV parser handling
  RFC 4180 — quoted fields with embedded newlines, escaped `""`, header
  detection. Normalizes awesome-chatgpt-prompts rows (`act` → name,
  `prompt` → content).
- **JSON parser** (`parse_json_source.ts`): Parses Rosehill
  `{ metadata, prompts[] }` shape. Extracts `agent_name`, `description`,
  `full_data."System Prompt"`, and feature flags. Skips entries with
  empty/null system prompts.

Both return `RawEtherEntry[]` for uniform downstream processing.

## Error Hierarchy

```
SoulsError (existing)
  EtherError
    EtherFetchError       — network failures, timeouts, bad HTTP status
    EtherParseError       — malformed CSV/JSON response
    EtherNotFoundError    — source or entry ID not found
```

## Operator Notes

- The ether database is completely independent from the main souls database.
  Deleting `ether.db` and re-running `refreshAll` rebuilds everything.
- `registerDefaults()` uses `INSERT OR IGNORE` — safe to call multiple times.
- ETag-based conditional fetching means `refreshAll()` is cheap when sources
  haven't changed (304 responses skip all parsing and DB writes).
- The ether has no awareness of which entries have been manifested. You can
  manifest the same template multiple times to create independent souls.
- All ether operations use only Node.js built-in modules (`node:https`,
  `node:sqlite`). Zero external runtime dependencies.

## Related Modules

- [`souls`](SOULS.md): the identity records that manifested entries become
- [`soul_traits`](TRAITS.md): cognitive principles added after manifestation
  through the refinement cycle
- [`soul_shards`](SHARDS.md): behavioral observations deposited against
  manifested souls

## Public APIs

### Database

- `ether.open(path)`: open (or create) the ether database with all tables
  initialized. Returns a `SoulsDb`.

### Source Management

- `ether.registerDefaults(etherDb)`: register the two built-in sources.
- `ether.register(etherDb, source)`: register a custom source.
- `ether.listSources(etherDb)`: all registered sources.
- `ether.getSource(etherDb, sourceId)`: single source by ID.
- `ether.removeSource(etherDb, sourceId)`: remove a source and all its entries.

### Refresh (async)

- `ether.refreshSource(etherDb, sourceId, options?)`: fetch, parse, and upsert
  one source atomically. Returns `EtherRefreshResult` with entry count, skip
  status, and duration.
- `ether.refreshAll(etherDb, options?)`: refresh all registered sources
  sequentially. Returns `EtherRefreshAllResult`.

### Search & Browse (sync)

- `ether.search(etherDb, query, options?)`: FTS5 keyword search. Returns
  `EtherSearchResult[]` ranked by BM25 relevance.
- `ether.getEntry(etherDb, id)`: single entry by ID. Returns `EtherEntry`
  with parsed tags and metadata.
- `ether.countEntries(etherDb, sourceId?)`: total entry count, optionally
  filtered by source.

### Manifest

- `ether.manifest(soulsDb, entry, options?)`: create a soul from an ether
  entry. The entry's content becomes the soul's essence. Name, description,
  and slug are overridable.
