---
name: souls
description: "Store and refine cognitive identities, traits, behavioral evidence, and persistent traces. Use when recording observations, reviewing soul health, or consolidating traits."
license: "MIT"
compatibility: "Release binary ghostpaw-souls (no runtime needed); MCP stdio via ghostpaw-souls mcp."
---

# souls

## Install

Linux/macOS (checks SHA256SUMS and installs ~/.local/bin/ghostpaw-souls):

```sh
curl -fsSL https://raw.githubusercontent.com/GhostPawJS/souls/main/install.sh | sh
```

Windows x64:

```powershell
irm https://raw.githubusercontent.com/GhostPawJS/souls/main/install.ps1 | iex
```

Run tools as `ghostpaw-souls ...`; use `~/.local/bin/ghostpaw-souls` if it is not on PATH.

Use trace_soul for persistent dated facts and commitments; use review_traces for list, search (query required; ranked text with substring fallback), due, show, history, chain, changed and stats. Settle as done or dropped with a reason. Roll settles and creates the next open trace atomically with nextDue. Use record_batch items for atomic imports, import to preserve historical updatedAt, and compact only for explicit revision text maintenance. Supersedes accepts a primary id or an array including merge parents; each parent has one successor. Filter commitments with excludeTags: ["belief"], use tagPrefix for categories, and page reads with limit and offset or all. Calendar dates resolve to local midnight using tz, TZ, then the system zone; a bare due date means the end of that local day. Stats preserve legacy all-dated promiseSettleRate and add promiseSettleRateTagged; chain heads and weights default to 20 with headsTotal/headsTruncated and weightsTotal/weightsTruncated. Shards may cite traceIds. Default readiness requires one converged cluster of at least three shards spanning two sources; readiness legacy restores the prior gate. render --traces open|due opts into commitments. Souls stores cognitive identities, traits, and behavioral evidence locally. Search and inspect evidence before proposing changes. Record observations with provenance, refine traits with supporting evidence, and validate level-up plans before execution. Retirement makes a soul dormant; reversion restores earlier state. Ask for clarification when the intended action is ambiguous. Hosts can publish with render <soul> --into <file> --expect-hash <sha256|none>; --budget bounds the entire file and trims only the marker block. diff <soul> --against <file> exits 0 when equal and 1 when different. Soul references resolve numeric id, ext:<externalId>, slug, then name. CLI -q, --quiet suppresses stdout; array flags can be repeated or accept JSON arrays (commas stay literal). shard add --batch @file imports JSON arrays or JSON Lines. render accepts --order citations|density (default citations), --provenance and --no-provenance (stored souls omit provenance by default). Profiles expose freshness, headroom and evidenceRatio; health is their clamped product. Readiness options minSourceDiversity and minSpreadDays default to 2 and 1; CLI flags are --min-source-diversity and --min-spread-days. level validate without --plan reports readiness and blockers; with --plan it validates the plan. soul update --shard-ids may be repeated to cite essence evidence. Non-strict essence updates with both operator and reason suppress evidence warnings. Use review <soul> --no-change --reason <text> to record a review without edits. Persistent strict checks: config set strict true|false; per-call strict or --no-strict overrides GHOSTPAW_SOULS_STRICT (1/true/yes or 0/false/no), then the database setting. Shards accept occurredAt, idempotencyKey, and ref; a one-day spread must span two sources by occurrence time. Named operator corrections bypass readiness and remain in revision history. Capacity-sensitive refinement and level commands accept --trait-limit. report --expect-ids @file or @- checks external bindings (exit 0 matching, 1 different).

## Running inside sandboxed agent harnesses

Inside a Codex CLI `--sandbox workspace-write` session, the database and its
parent directory must be inside a writable root, including SQLite's `-wal` and
`-shm` side files. A default DB under `~/.ghostpaw` outside those roots can fail
with `SQLITE_CANTOPEN` or `EPERM` (often exit 70; directory creation failures
may exit 2), even when normal shell permissions allow access. Put the DB inside the workspace with `--db ./state/souls.db`,
or set `GHOSTPAW_SOULS_DB="$PWD/state/souls.db"` for CLI/MCP use.

To use an external DB directory, add it when starting the OpenAI Codex CLI
(replace `<dir-with-db>` with its absolute path):

```sh
codex exec --sandbox workspace-write --add-dir <dir-with-db> "Run the GhostPaw CLI"
```

Alternatively, set `sandbox_workspace_write.writable_roots` in
`~/.codex/config.toml` before starting the session:

```toml
[sandbox_workspace_write]
writable_roots = ["/absolute/dir-with-db"]
```

## What goes where

| Store | Use for |
| --- | --- |
| souls | Agent identity and voice. |
| codex | Beliefs with uncertainty and provenance: things that might be wrong or change. |
| affinity | People, organizations, agents, and their relationships. |
| questlog | Tasks and deadlines. |
| grimoire | Procedures and how-tos. |
| Plain memory/files | Stable operational facts. |

For boundary cases, keep identity in souls, a revisable claim about someone in codex linked to their affinity record, actionable work in questlog, and reusable steps in grimoire; leave stable setup details in plain memory/files.


## Calling tools

Compact cheat sheet: `ghostpaw-souls skill --short`. List guides: `ghostpaw-souls skill --list`.

MCP: connect to ghostpaw-souls, then call a tool by name with its JSON arguments.

CLI: `ghostpaw-souls call <tool> '<JSON object>'` or `ghostpaw-souls <tool> --parameter value`.

Inspect schemas with `ghostpaw-souls describe <tool>`. Use `--db <path>` to select a database.

## search_souls

Search shards by content using full-text search, or list pending shards with optional filters.

Use when: Use this to find specific observations by content (with query) or to browse pending shards (without query). Filter by soul, tags, or limit as needed.

Not for: Do not use this to view the structured evidence report — use inspect_souls_item with includeEvidence. Do not use this to deposit observations — use observe_soul.

Read-only.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| status | string | no | pending, sealed, faded, all. Filter status; defaults to pending for list and all for search. |
| offset | integer | no | Skip this many results. |
| query | string | no | FTS5 search query. Omit to list pending shards. |
| soulId | integer / string | no | Filter by soul ID. Accepts numeric id, ext: reference, slug, or name. |
| tags | array | no | Filter by all supplied topic tags. |
| limit | integer | no | Maximum results. |

```sh
ghostpaw-souls call search_souls '{}'
```

## review_souls

List all active souls, run the maintenance cycle, or check crystallization readiness.

Use when: Use list to discover active souls. Use maintenance to run the standard maintenance pass (fades exhausted shards + checks readiness) as part of a regular cycle. Use readiness to check which souls are ready for refinement without running maintenance.

Not for: Do not use this to inspect a specific soul in detail — use inspect_souls_item. Do not use this to search shards — use search_souls.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| minSourceDiversity | integer | no | Minimum source diversity (default 2). |
| minSpreadDays | number | no | Minimum occurrence spread in days (default 1). |
| readiness | string | no | converged, legacy. string value. |
| minClusterSize | integer | no | Minimum converged cluster size, default 3. |
| soulId | integer / string | no | Soul to review. Accepts numeric id, ext: reference, slug, or name. |
| noChange | boolean | no | Record a review without edits and stamp attuned. |
| reason | string | no | Review reason. |
| view | string | yes | list, maintenance, readiness, history. The operation to perform. |

```sh
ghostpaw-souls call review_souls '{"view":"list"}'
```

## inspect_souls_item

Get the full profile, rendered identity block, and optionally the evidence report for a single soul.

Use when: Use this when you need the complete current state of a soul — traits, capacity, health, rendered identity — before deciding on a refinement action. Add includeEvidence when you need the clustered evidence report with signals and suggested actions.

Not for: Do not use this to search across shards — use search_souls. Do not use this to make changes — use refine_soul, level_up_soul, or manage_soul.

Read-only.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| order | string | no | citations, density. Render order (default citations). |
| full | boolean | no | Retain all selected cluster members in evidence payloads. |
| maxMembersPerCluster | integer | no | Maximum cluster members rendered (default 5). |
| history | boolean | no | Include wording revision history. |
| minSourceDiversity | integer | no | Minimum source diversity (default 2). |
| minSpreadDays | number | no | Minimum occurrence spread in days (default 1). |
| readiness | string | no | converged, legacy. string value. |
| minClusterSize | integer | no | Minimum converged cluster size, default 3. |
| soulId | integer / string | yes | The soul ID to inspect. Accepts numeric id, ext: reference, slug, or name. |
| includeEvidence | boolean | no | Include evidence report with clusters and signals. Default false. |
| includeProvenance | boolean | no | Include provenance in rendered identity. Default false. |

```sh
ghostpaw-souls call inspect_souls_item '{"soulId":1}'
```

## observe_soul

Deposit behavioral observations (shards) for one or more souls, or reveal previously sealed shards.

Use when: Use this whenever you have a behavioral observation to record — delegation outcome, session note, reflection, feedback. Use drop_batch for importing multiple observations at once. Use reveal to unlock deferred shards at the appropriate moment (task completion, session close).

Not for: Do not use this to read evidence — use search_souls or inspect_souls_item. Do not use this to add traits — use refine_soul.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | drop, drop_batch, reveal. string value. |
| occurredAt | integer / string | no | Observation timestamp, ISO or epoch milliseconds. |
| idempotencyKey | string | no | Unique ingestion key. |
| ref | string | no | External evidence reference. |
| now | integer | no | Timestamp in epoch milliseconds; occurredAt takes precedence. |
| minSourceDiversity | integer | no | Minimum source diversity (default 2). |
| minSpreadDays | number | no | Minimum occurrence spread in days (default 1). |
| readiness | string | no | converged, legacy. string value. |
| minClusterSize | integer | no | Minimum converged cluster size, default 3. |
| content | string | no | Behavioral observation text. |
| source | string | no | Evidence channel origin label. |
| soulIds | array | no | Soul IDs to attribute this observation to. |
| tags | array | no | Optional topic tags. |
| traceIds | array | no | Trace ids, repeated or comma separated. |
| sealed | boolean | no | If true, shard is deferred until revealed. |
| shards | array | no | Array of shards for batch deposit. |
| shards[].content | string | yes | Observation text. |
| shards[].source | string | yes | Evidence source. |
| shards[].soulIds | array | yes | Attributed souls. |
| shards[].tags | array | no | Topic tags. |
| shards[].traceIds | array | no | Trace citations. |
| shards[].sealed | boolean | no | Defer until revealed. |
| shards[].occurredAt | integer / string | no | integer / string value. |
| shards[].idempotencyKey | string | no | Unique ingestion key. |
| shards[].ref | string | no | External evidence reference. |
| shards[].now | integer | no | Timestamp in epoch milliseconds. |
| shardIds | array | no | Shard IDs to reveal. |

```sh
ghostpaw-souls call observe_soul '{"action":"drop","content":"Observed careful review.","source":"manual_review","soulIds":[]}'
```

```sh
ghostpaw-souls call observe_soul '{"action":"drop_batch","shards":[]}'
```

```sh
ghostpaw-souls call observe_soul '{"action":"reveal","shardIds":[]}'
```

## refine_soul

Add, revise, revert, or reactivate traits; cite evidence; apply atomic refinement with revision conflict checks.

Use when: Use after inspecting the evidence report (inspect_souls_item with includeEvidence) to make targeted identity mutations: add a new trait from a novel cluster, revise a stale trait, revert a trait that is causing regression, cite shards to earn provenance, stamp attuned after completing a refinement pass.

Not for: Do not use this for consolidation and essence rewriting — use level_up_soul. Do not use this to deposit observations — use observe_soul.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | refine_with_evidence, add_trait, revise_trait, revert_trait, reactivate_trait, cite_shard, stamp_attuned. The refinement action to perform. |
| minSourceDiversity | integer | no | Minimum source diversity (default 2). |
| minSpreadDays | number | no | Minimum occurrence spread in days (default 1). |
| readiness | string | no | converged, legacy. string value. |
| minClusterSize | integer | no | Minimum converged cluster size, default 3. |
| soulId | integer / string | no | Soul ID (required for add_trait, stamp_attuned). Accepts numeric id, ext: reference, slug, or name. |
| traitId | integer | no | Trait ID (required for revise_trait, revert_trait, reactivate_trait, cite_shard). |
| principle | string | no | The cognitive rule text. |
| provenance | string | no | Evidence chain justifying the trait. |
| strict | boolean | no | Enforce readiness, evidence, and capacity checks. |
| operator | string | no | Named operator correction; bypasses the strict evidence gate. |
| reason | string | no | Reason for the wording change. |
| shardIds | array | no | Supporting shard IDs. |
| traitLimit | integer | no | Override active trait capacity. |
| expectedRevision | integer | no | Expected latest revision id (0 for none). |
| refineAction | string | no | add, revise. Atomic refinement operation; inferred from traitId when omitted. |
| shardId | integer | no | Shard ID to link (for cite_shard). |

```sh
ghostpaw-souls call refine_soul '{"action":"refine_with_evidence"}'
```

```sh
ghostpaw-souls call refine_soul '{"action":"add_trait","soulId":1,"principle":"Check intent before details.","provenance":"Repeated review observations."}'
```

```sh
ghostpaw-souls call refine_soul '{"action":"revise_trait","traitId":1,"principle":"Check intent before details.","provenance":"Repeated review observations."}'
```

## level_up_soul

Validate, execute, or revert a level-up plan for a soul — consolidating traits, promoting knowledge into essence, and incrementing the generation.

Use when: Use validate without a plan to check readiness and blockers, or with a plan to check it before executing it. Use execute when the plan is validated and the soul is ready for restructuring. Use revert to undo the last level-up if the outcome was wrong.

Not for: Do not use this for targeted trait mutations — use refine_soul. Do not use this unless the soul is at or near trait capacity and crystallization is ready.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | validate, execute, revert. The operation to perform. |
| readiness | string | no | converged, legacy. string value. |
| minClusterSize | integer | no | Minimum converged cluster size, default 3. |
| minSourceDiversity | integer | no | Minimum source diversity for planless readiness (default 2). |
| minSpreadDays | number | no | Minimum occurrence spread in days for planless readiness (default 1). |
| traitLimit | integer | no | Override active trait capacity. |
| strict | boolean | no | Reject new validation errors instead of warning. |
| soulId | integer / string | yes | The soul ID. Accepts numeric id, ext: reference, slug, or name. |
| plan | object | no | The level-up plan; omit with validate to report readiness and blockers. |
| plan.newEssence | string | yes | The new essence narrative after level-up. |
| plan.consolidations | array | yes | Consolidation groups. |
| plan.consolidations[].sourceTraitIds | array | yes | Trait IDs to merge. |
| plan.consolidations[].mergedPrinciple | string | yes | The merged principle. |
| plan.consolidations[].mergedProvenance | string | yes | The merged provenance. |
| plan.promotedTraitIds | array | yes | Trait IDs to absorb into essence. |
| plan.carriedTraitIds | array | yes | Trait IDs to carry unchanged. |

```sh
ghostpaw-souls call level_up_soul '{"action":"validate","soulId":1,"plan":{"newEssence":"Review intent and evidence.","consolidations":[],"promotedTraitIds":[],"carriedTraitIds":[]}}'
```

```sh
ghostpaw-souls call level_up_soul '{"action":"execute","soulId":1,"plan":{"newEssence":"Review intent and evidence.","consolidations":[],"promotedTraitIds":[],"carriedTraitIds":[]}}'
```

```sh
ghostpaw-souls call level_up_soul '{"action":"revert","soulId":1}'
```

## manage_soul

Create, update, retire, or awaken a soul; read or set database configuration.

Use when: Use create to bootstrap a new soul with an initial essence. Use update to change the name, essence, or description without incrementing the level. Use retire to mark a soul as dormant. Use awaken to restore a dormant soul.

Not for: Do not use update to restructure identity — use level_up_soul. Do not use this to make trait changes — use refine_soul.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | create, update, retire, awaken, config_set, config_get, config_list. The operation to perform. |
| externalId | string | no | Unique external identity binding. |
| key | string | no | Configuration key (strict). |
| value | string | no | Configuration value: true or false. |
| strict | boolean | no | Enforce readiness and evidence checks for essence changes. |
| operator | string | no | Named operator correction. |
| reason | string | no | Reason for the change. |
| shardIds | array | no | Supporting shard IDs. |
| slug | string | no | Stable soul slug. |
| name | string | no | Soul name. |
| essence | string | no | Soul essence narrative. |
| description | string | no | Soul description. |
| minSourceDiversity | integer | no | Minimum source diversity (default 2). |
| minSpreadDays | number | no | Minimum occurrence spread in days (default 1). |
| readiness | string | no | converged, legacy. string value. |
| minClusterSize | integer | no | Minimum converged cluster size, default 3. |
| soulId | integer / string | no | Soul ID. Accepts numeric id, ext: reference, slug, or name. |

```sh
ghostpaw-souls call manage_soul '{"action":"create","name":"Reviewer","essence":"Read intent before details.","description":"Code review identity"}'
```

```sh
ghostpaw-souls call manage_soul '{"action":"update","soulId":1}'
```

```sh
ghostpaw-souls call manage_soul '{"action":"retire","soulId":1}'
```

## trace_soul

Record persistent facts and commitments, revise, settle, roll forward atomically, link, tag, or cite traces.

Use when: Use for dated facts, promises, beliefs, approvals, and decisions.

Not for: Use observe_soul for behavioral interpretations and review_traces for reading.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | record, revise, settle, link, unlink, tag, untag, cite, roll, record_batch, compact. string value. |
| items | array | no | Record inputs; all succeed or none are written. |
| dryRun | boolean | no | Report compaction without writing. |
| vacuum | boolean | no | Vacuum after explicit compaction. |
| id | integer | no | Trace id. |
| traceId | integer | no | Trace id alias. |
| shardId | integer | no | Citing shard id. |
| text | string | no | Fact or commitment; never credentials. |
| reason | string | no | Reason for this change. |
| souls | array | no | Soul links. |
| souls[].soul | integer / string | yes | Linked soul. Accepts numeric id, ext: reference, slug, or name. |
| souls[].role | string / integer | yes | string / integer value. |
| tags | array | no | Category tags. |
| dueAt | integer / string / null | no | integer / string / null value. |
| createdAt | integer / string | no | integer / string value. |
| updatedAt | integer / string | no | integer / string value. |
| import | boolean | no | Preserve historical update time; revision reason is import. |
| nextDue | integer / string | no | integer / string value. |
| at | integer / string | no | integer / string value. |
| now | integer / string | no | integer / string value. |
| tz | string | no | IANA time zone. |
| weight | number / string / null | no | number / string / null value. |
| supersedes | array,integer,null | no | array,integer,null value. |
| as | string | no | done, dropped. string value. |
| settle | object | no | Object: as (required), reason (required), at |
| settle.as | string | yes | done, dropped. string value. |
| settle.reason | string | yes | Honest outcome. |
| settle.at | integer / string | no | integer / string value. |
| soul | array | no | Linked soul[:owner\|counterpart\|subject]; repeat for more links. |
| tag | array | no | array value. |
| due | string | no | Due date or none. |
| settled | string | no | done, dropped. Record an already settled trace. |

```sh
ghostpaw-souls call trace_soul '{"action":"record","text":"Review the draft","souls":[{"soul":1,"role":"owner"}]}'
```

```sh
ghostpaw-souls call trace_soul '{"action":"revise"}'
```

```sh
ghostpaw-souls call trace_soul '{"action":"settle"}'
```

## review_traces

Read traces, due commitments, revision history, chains, store changes, and statistics.

Use when: Review persistent facts and commitments without writing.

Not for: Use trace_soul to write or settle traces.

Read-only.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| view | string | yes | list, search, due, show, history, chain, changed, stats. string value. |
| id | integer | no | Trace id. |
| soul | string | no | string value. |
| withSoul | integer / string | no | Other soul. Accepts numeric id, ext: reference, slug, or name. |
| soulId | integer / string | no | Linked soul. Accepts numeric id, ext: reference, slug, or name. |
| withSoulId | integer / string | no | Other soul for settle rate. Accepts numeric id, ext: reference, slug, or name. |
| role | string / integer | no | string / integer value. |
| state | string | no | open, done, dropped. string value. |
| tag | string / array | no | string / array value. |
| tagPrefix | string | no | Category prefix. |
| excludeTags | array | no | Excluded categories. |
| all | boolean | no | Return all results. |
| query | string | no | Text substring for list; literal search terms for search (trailing * matches prefixes). |
| tags | array | no | Required categories. |
| dueBefore | integer / string | no | integer / string value. |
| since | integer / string | no | integer / string value. |
| now | integer / string | no | integer / string value. |
| tz | string | no | IANA time zone. |
| within | string | no | Window such as 3d or 12h. |
| includeRetired | boolean | no | Include retired souls. |
| includeSuperseded | boolean | no | Include chain ancestors. |
| limit | integer | no | Page size. |
| offset | integer | no | Page offset. |
| halfLifeDays | number | no | Decay half life, default 30 days. |
| with | string | no | string value. |
| excludeTag | array | no | array value. |

```sh
ghostpaw-souls call review_traces '{"view":"list"}'
```

## Workflow guides

- `ghostpaw-souls skill observe-behavior-well`: Deposit high-quality behavioral observations with correct source labels and tags.
- `ghostpaw-souls skill record-and-settle-traces`: Record persistent facts and commitments, cite them as evidence, and settle their lifecycle.
- `ghostpaw-souls skill run-maintenance-pass`: Run the standard maintenance cycle, interpret results, and triage souls ready for refinement.
- `ghostpaw-souls skill produce-trait-proposals-from-evidence`: Read an evidence report, interpret signals, and propose add/revise/revert trait mutations.
- `ghostpaw-souls skill judge-consolidation-versus-promotion`: Decide whether to consolidate, promote, or carry each trait during a level-up plan.
- `ghostpaw-souls skill execute-level-up-plan`: Validate, execute, and verify a level-up plan for a soul.
- `ghostpaw-souls skill bootstrap-new-soul`: Create a new soul with an initial essence and begin the observation cycle.
- `ghostpaw-souls skill detect-and-fix-regression`: Spot regression signals in evidence, use revert-trait or revert-level-up to restore identity integrity.
- `ghostpaw-souls skill review-soul-health`: Interpret the health metric, staleness signals, and capacity state to assess the overall condition of a soul.

## Principles

- One proposal per cycle.
- A revert is as valuable as an addition.

## Without the binary

For npm-based environments (Node 24+): `npx -y @ghostpaw/souls ...`.

Harnesses embedding it in code can import `@ghostpaw/souls` as a library.
