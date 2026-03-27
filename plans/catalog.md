# Plan: Catalog Submodule

A lazily-fetched, FTS-searchable prompt/persona cache with robust refresh and a one-call install bridge into the souls system. Zero runtime dependencies -- only `node:https`, `node:sqlite`, and `node:http` (test servers).

---

## 1. Architecture Overview

```
Remote Source (GitHub raw)
       |
       v  [node:https GET + ETag]
Raw text (CSV or JSON)
       |
       v  [parse_csv / JSON.parse]
RawCatalogEntry[]
       |
       v  [BEGIN TRANSACTION]
       |-- DELETE old entries for source
       |-- INSERT new entries
       |-- FTS5 rebuild
       |-- UPDATE source metadata
       v  [COMMIT]
Local SQLite catalog.db (FTS5-indexed)
       |
       v  [catalog.search() -> FTS5 MATCH]
CatalogSearchResult[]
       |
       v  [catalog.install() -> createSoul()]
SoulRecord (in souls DB)
```

The catalog lives in its **own SQLite database file**, separate from the souls data. The catalog is a disposable cache -- delete it and re-fetch anytime. Soul data is never at risk.

---

## 2. SQLite Schema

Three objects in the catalog database:

```sql
CREATE TABLE catalog_sources (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,         -- 'github-csv' | 'github-json'
    url TEXT NOT NULL,
    label TEXT NOT NULL,
    etag TEXT,                  -- HTTP ETag for conditional refresh
    last_fetched_at INTEGER,
    entry_count INTEGER DEFAULT 0
) STRICT;

CREATE TABLE catalog_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL REFERENCES catalog_sources(id),
    external_id TEXT NOT NULL,  -- unique within source
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,      -- the actual system prompt
    category TEXT,
    tags TEXT,                  -- comma-separated
    metadata TEXT,              -- JSON blob for source-specific extras
    fetched_at INTEGER NOT NULL,
    UNIQUE(source_id, external_id)
) STRICT;

CREATE INDEX idx_catalog_entries_source ON catalog_entries(source_id);

CREATE VIRTUAL TABLE catalog_fts USING fts5(
    name, description, content, tags,
    content='catalog_entries',
    content_rowid='id'
);
```

FTS5 indexes four columns. The external content mode means data lives in `catalog_entries` only; the FTS index is rebuilt after each refresh (no triggers needed since writes only happen during batch refresh).

---

## 3. Initial Sources

### 3a. awesome-chatgpt-prompts (github-csv)

- **URL**: `https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv`
- **Format**: RFC 4180 CSV with columns `act,prompt,for_devs,type,contributor`
- **Volume**: ~500 entries, ~1MB, single GET
- **Mapping**: `act` -> name, `prompt` -> content, `type` -> category, `contributor` -> metadata

### 3b. Rosehill System Prompt Library (github-json)

- **URL**: `https://raw.githubusercontent.com/danielrosehill/System-Prompt-Library/main/index/index.json`
- **Format**: JSON with `{ metadata: {...}, prompts: [...] }`, each prompt has `agent_name`, `description`, `full_data."System Prompt"`, feature flags
- **Volume**: 1,290 entries, ~1MB, single GET
- **Mapping**: `agent_name` -> name, `description` -> description, `full_data."System Prompt"` -> content, feature flags -> metadata JSON blob, `original_filename` -> external_id

Both are single-file fetches. No pagination, no API keys, no rate limits.

---

## 4. Robust Refresh Strategy

Per-source, never all-or-nothing across sources. Sequence for each:

1. Read source config from `catalog_sources` (get stored ETag)
2. HTTP GET with `If-None-Match: <etag>` header
3. **If 304 Not Modified**: update `last_fetched_at`, skip parsing. Done.
4. Parse response body into `RawCatalogEntry[]` (in memory)
5. **BEGIN TRANSACTION**
   - `DELETE FROM catalog_entries WHERE source_id = ?`
   - Batch `INSERT INTO catalog_entries` (new entries)
   - `INSERT INTO catalog_fts(catalog_fts) VALUES('rebuild')`
   - `UPDATE catalog_sources SET etag=?, last_fetched_at=?, entry_count=?`
6. **COMMIT**

**Failure modes**:
- Fetch fails (network error, timeout, HTTP 4xx/5xx): no DB writes at all. Old entries preserved.
- Parse fails (malformed CSV/JSON): no DB writes. Old entries preserved.
- Transaction fails (disk error, constraint violation): SQLite rolls back. Old entries preserved.
- Process killed mid-transaction: WAL recovery restores pre-transaction state on next open.

The `refreshAll` function iterates sources, collecting per-source results. One source failing does not prevent others from refreshing.

---

## 5. HTTP Fetcher (`fetch_text.ts`)

Minimal `node:https` wrapper, no dependencies:

- GET with `User-Agent: ghostpaw-souls-catalog/0.1`
- Follow 301/302/307 redirects up to 5 hops
- Send `If-None-Match: <etag>` when available
- Configurable timeout (default 30s)
- Returns `{ body: string, etag: string | null, status: number }`
- Throws `CatalogFetchError` on network errors, timeouts, and non-2xx/304 status codes

---

## 6. CSV Parser (`parse_csv_source.ts`)

The awesome-chatgpt-prompts CSV contains multi-line quoted fields with escaped double-quotes. Requires a proper state-machine parser (~50 lines), not `split('\n')`. Handles:

- Quoted fields with embedded newlines and commas
- Escaped quotes: `""` -> `"`
- Header row detection and column mapping
- Only extracts needed columns (`act`, `prompt`, `type`, `contributor`)

---

## 7. JSON Normalizer (`parse_json_source.ts`)

Parses the Rosehill `index.json` structure:

```typescript
// Input shape (abbreviated)
interface RosehillIndex {
    metadata: { total_prompts: number };
    prompts: Array<{
        agent_name: string;
        description: string;
        full_data: { "System Prompt": string; "Creation Date": string; ... };
        features: { is_agent: boolean; ... };
        metadata: { original_filename: string };
    }>;
}
```

Normalizes into `RawCatalogEntry[]`, skipping entries where `full_data."System Prompt"` is empty/null.

---

## 8. Search (`search_catalog.ts`)

```typescript
function search(db: SoulsDb, query: string, options?: {
    sourceId?: string;
    category?: string;
    limit?: number;       // default 50
}): CatalogSearchResult[];
```

Uses FTS5 `MATCH` with optional post-filters. The query supports FTS5 syntax (bare words, phrases in `"quotes"`, boolean `AND`/`OR`/`NOT`). Results ordered by FTS5 rank (BM25).

Returns entries with all fields plus a `rank` score for relevance ordering.

---

## 9. Install Bridge (`install_soul.ts`)

```typescript
function install(soulsDb: SoulsDb, entry: CatalogEntry, options?: {
    name?: string;        // override entry name
    description?: string; // override entry description
    slug?: string;
    now?: number;
}): SoulRecord;
```

Mapping:

| Catalog field | Soul field | Notes |
|---|---|---|
| `entry.name` | `name` | Overridable. Trimmed. |
| `entry.content` | `essence` | The system prompt IS the soul's identity. |
| `entry.description` | `description` | Overridable. Falls back to first 200 chars of content if empty. |

Calls `createSoul()` from the existing write surface -- full validation, no SQL duplication. The caller does two steps: `getEntry()` then `install()`. This keeps the function decoupled from the catalog DB.

---

## 10. Public API Surface

Exported as `catalog` namespace from the main barrel, following the existing pattern for `read`, `write`, `tools`, `skills`:

```typescript
import { catalog } from '@ghostpaw/souls';

// Lifecycle
const catDb = catalog.open('/path/to/catalog.db');
catDb.close();

// Source management
catalog.registerDefaults(catDb);        // registers both known sources
catalog.register(catDb, { id, kind, url, label });
catalog.listSources(catDb);             // CatalogSource[]
catalog.removeSource(catDb, sourceId);  // deletes source + its entries

// Refresh (async -- network I/O)
await catalog.refreshSource(catDb, 'awesome-chatgpt-prompts');
await catalog.refreshAll(catDb);

// Search & browse (sync -- instant)
catalog.search(catDb, 'security architect');
catalog.getEntry(catDb, 42);
catalog.countEntries(catDb);
catalog.countEntries(catDb, 'rosehill');

// Install
catalog.install(soulsDb, entry);
catalog.install(soulsDb, entry, { name: 'Custom Name' });
```

---

## 11. Error Hierarchy

Extends the existing `SoulsError` base:

```
SoulsError
  CatalogError
    CatalogFetchError       -- network failures, timeouts, bad status codes
    CatalogParseError       -- malformed CSV/JSON
    CatalogNotFoundError    -- source or entry ID not found
```

---

## 12. File Structure

New `src/catalog/` directory, one function per file, colocated tests:

```
src/catalog/
  types.ts                    -- CatalogSource, CatalogEntry, SearchResult, RefreshResult, etc.
  errors.ts                   -- CatalogError, CatalogFetchError, CatalogParseError, CatalogNotFoundError
  errors.test.ts
  init_catalog_tables.ts      -- CREATE TABLE + FTS + indexes
  init_catalog_tables.test.ts
  open_catalog.ts             -- new DatabaseSync(path), init tables, return SoulsDb
  open_catalog.test.ts
  known_sources.ts            -- AWESOME_PROMPTS + ROSEHILL source configs
  known_sources.test.ts
  register_source.ts          -- INSERT into catalog_sources
  register_source.test.ts
  register_defaults.ts        -- registers both known sources
  register_defaults.test.ts
  list_sources.ts             -- SELECT all from catalog_sources
  list_sources.test.ts
  remove_source.ts            -- DELETE source + cascade entries
  remove_source.test.ts
  count_entries.ts             -- COUNT(*) with optional source filter
  count_entries.test.ts
  get_entry.ts                -- SELECT single entry by id
  get_entry.test.ts
  search_catalog.ts           -- FTS5 MATCH query
  search_catalog.test.ts
  install_soul.ts             -- createSoul() bridge
  install_soul.test.ts
  fetch_text.ts               -- node:https GET wrapper
  fetch_text.test.ts
  parse_csv_source.ts         -- RFC 4180 CSV parser + awesome-prompts normalizer
  parse_csv_source.test.ts
  parse_json_source.ts        -- Rosehill JSON normalizer
  parse_json_source.test.ts
  refresh_source.ts           -- fetch + parse + atomic upsert for one source
  refresh_source.test.ts
  refresh_all.ts              -- sequential refresh across all sources
  refresh_all.test.ts
  index.ts                    -- barrel exports
```

17 implementation files + 15 test files + 1 types file = 33 files.

---

## 13. Build / Export Changes

- **[src/index.ts](src/index.ts)**: add `export * as catalog from './catalog/index.ts'`
- **[tsup.config.ts](tsup.config.ts)**: no changes needed (single entry point, treeshake handles it)
- **[package.json](package.json)**: no subpath export needed (follows sibling repo pattern)
- **[src/catalog/index.ts](src/catalog/index.ts)**: barrel re-exporting all public functions and types

---

## 14. Testing Strategy

- **Schema tests**: verify `sqlite_master` for correct table/index creation
- **CSV parser tests**: hardcoded strings with edge cases (multiline fields, escaped quotes, empty fields, trailing newlines, missing columns)
- **JSON normalizer tests**: sample Rosehill entries including edge cases (null System Prompt, empty agent_name)
- **Search tests**: seed entries manually, verify FTS5 MATCH works, test ranking, test source/category filters, test empty results
- **Refresh tests**: create `node:http` test server that serves known CSV/JSON, verify entries land in DB, verify ETag/304 optimization, verify atomic rollback on parse failure
- **Install tests**: seed catalog entry in catalog DB, call install with a separate souls DB, verify SoulRecord fields map correctly, test with overrides
- **Robustness tests**: simulate failed fetch, verify old entries survive; simulate malformed response, verify no partial writes

---

## 15. Extensibility Path

Adding a new source type (e.g., HuggingFace rows API) later requires only:
1. Add `'huggingface-rows'` to `CatalogSourceKind` union
2. Write `parse_hf_source.ts` normalizer
3. Add a `case 'huggingface-rows':` in `refresh_source.ts`

No abstract class hierarchies or plugin registries -- just a switch on the `kind` string.

---

## 16. Task Breakdown

1. Types + errors + init tables + open catalog
2. Source management (register, list, remove, known sources, register defaults)
3. HTTP fetch wrapper (node:https, redirects, ETag, timeout)
4. CSV parser + awesome-chatgpt-prompts normalizer
5. JSON normalizer for Rosehill index
6. refresh_source + refresh_all (atomic upsert)
7. FTS5 search
8. get_entry + count_entries
9. install_soul bridge
10. Barrel exports + main index.ts integration
11. All colocated test files
