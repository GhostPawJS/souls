---
name: souls
description: "Store and refine cognitive identities, traits, and behavioral evidence. Use when recording observations, reviewing soul health, or consolidating traits."
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

Souls stores cognitive identities, traits, and behavioral evidence locally. Search and inspect evidence before proposing changes. Record observations with provenance, refine traits with supporting evidence, and validate level-up plans before execution. Retirement makes a soul dormant; reversion restores earlier state. Ask for clarification when the intended action is ambiguous.

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
| query | string | no | FTS5 search query. Omit to list pending shards. |
| soulId | integer | no | Filter by soul ID. |
| tags | array | no | Filter by topic tags (list mode). |
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
| view | string | yes | list, maintenance, readiness. The operation to perform. |

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
| soulId | integer | yes | The soul ID to inspect. |
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
| content | string | no | Behavioral observation text. |
| source | string | no | Evidence channel origin label. |
| soulIds | array | no | Soul IDs to attribute this observation to. |
| tags | array | no | Optional topic tags. |
| sealed | boolean | no | If true, shard is deferred until revealed. |
| shards | array | no | Array of shards for batch deposit. |
| shards[].content | string | yes | string value. |
| shards[].source | string | yes | string value. |
| shards[].soulIds | array | yes | array value. |
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

Add, revise, revert, or reactivate traits; cite shards to traits; stamp attunement.

Use when: Use after inspecting the evidence report (inspect_souls_item with includeEvidence) to make targeted identity mutations: add a new trait from a novel cluster, revise a stale trait, revert a trait that is causing regression, cite shards to earn provenance, stamp attuned after completing a refinement pass.

Not for: Do not use this for consolidation and essence rewriting — use level_up_soul. Do not use this to deposit observations — use observe_soul.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | add_trait, revise_trait, revert_trait, reactivate_trait, cite_shard, stamp_attuned. The refinement action to perform. |
| soulId | integer | no | Soul ID (required for add_trait, stamp_attuned). |
| traitId | integer | no | Trait ID (required for revise_trait, revert_trait, reactivate_trait, cite_shard). |
| principle | string | no | The cognitive rule text. |
| provenance | string | no | Evidence chain justifying the trait. |
| shardId | integer | no | Shard ID to link (for cite_shard). |

```sh
ghostpaw-souls call refine_soul '{"action":"add_trait","soulId":1,"principle":"Check intent before details.","provenance":"Repeated review observations."}'
```

```sh
ghostpaw-souls call refine_soul '{"action":"revise_trait","traitId":1,"principle":"Check intent before details.","provenance":"Repeated review observations."}'
```

```sh
ghostpaw-souls call refine_soul '{"action":"revert_trait","traitId":1}'
```

## level_up_soul

Validate, execute, or revert a level-up plan for a soul — consolidating traits, promoting knowledge into essence, and incrementing the generation.

Use when: Use validate to check a plan before executing it. Use execute when the plan is validated and the soul is ready for restructuring. Use revert to undo the last level-up if the outcome was wrong.

Not for: Do not use this for targeted trait mutations — use refine_soul. Do not use this unless the soul is at or near trait capacity and crystallization is ready.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | validate, execute, revert. The operation to perform. |
| soulId | integer | yes | The soul ID. |
| plan | object | no | The level-up plan. |
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

Create, update, retire, or awaken a soul.

Use when: Use create to bootstrap a new soul with an initial essence. Use update to change the name, essence, or description without incrementing the level. Use retire to mark a soul as dormant. Use awaken to restore a dormant soul.

Not for: Do not use update to restructure identity — use level_up_soul. Do not use this to make trait changes — use refine_soul.

Writes: writes_state.

| Parameter | Type | Required | Values / description |
| --- | --- | --- | --- |
| action | string | yes | create, update, retire, awaken. The operation to perform. |
| name | string | no | Soul name. |
| essence | string | no | Soul essence narrative. |
| description | string | no | Soul description. |
| soulId | integer | no | Soul ID. |

```sh
ghostpaw-souls call manage_soul '{"action":"create","name":"Reviewer","essence":"Read intent before details.","description":"Code review identity"}'
```

```sh
ghostpaw-souls call manage_soul '{"action":"update","soulId":1}'
```

```sh
ghostpaw-souls call manage_soul '{"action":"retire","soulId":1}'
```

## Workflow guides

- `ghostpaw-souls skill observe-behavior-well`: Deposit high-quality behavioral observations with correct source labels and tags.
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
