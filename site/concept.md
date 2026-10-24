# Concept: GhostPaw Souls

## Diagnosis
Depth pass on 2026-10-24 for the subdomain move. What stays strong: the replayed run, re-run against souls 0.3.0 with identical output. What was thin: the page did not say which kind of drift souls handles. Builders describe two: the model sliding off a persona in long sessions, and silent edits to the system prompt. Added: a section that separates them and says souls covers the second and does not watch replies.

## Voices
- People keep editing CLAUDE.md and AGENTS.md by hand, and the agent still ignores the rules in them. V002 V008 V006 V024 V012
- Personality drifts or flattens across model updates and long sessions. V009 V025 V014 V018 V028
- SOUL.md is now a named slot in agent tools, and people treat it as the place the agent's character lives. V016 V029 V031 V032 V015
- Deleting SOUL.md or the memory files just sends the agent back to its default. V036
- Agent identity gets designed by accident, by whoever needed a column that week. V026
- The question asked out loud: is agent personality infrastructure, versioned, reviewed and iterated? V043 V045
- Self-modifying agents already do strange things. V022 V034
- Consistent output in production is hard even when editing the prompt is easy. V044 V046
- Developers want instruction files to carry evidence and be checked, not just grow. V047 V048 V002
- Persona prompts are called brittle: over long sessions models drift into a generic tone. V064 V061 V066
- A system-prompt edit changes every session silently and nobody can tell which edit caused worse answers. V068 V067
- Builders turn personas into configuration (YAML compilers, hosted persona APIs) to make them reproducible. V064 V070 V063
- Some models resist any persona file at all. V065

## Buyer
A Node.js developer running an agent with a SOUL.md, AGENTS.md or CLAUDE.md that they edit by hand after every bad session (V002 V029). They come from a thread about agents ignoring rules or about SOUL.md (V008 V016), compare against Letta, LangMem and DSPy prompt optimisers and against plain markdown files (P001 P002 P003 P005), and need to see that changes to the identity are earned, checked and reversible (V043 V036). The hesitation most likely to stop them: an agent that rewrites its own prompt sounds like the strange self-modification they have already seen (V022).

## Decision path
1. Is this about the prompt file I keep patching? → hero names the change without a reason and the change that cannot be undone.
2. What decides when it changes? → the run: shards from one source are not enough, a second source makes the soul ready.
3. Can a bad change be caught and undone? → the run: a level-up plan that drops a trait is refused; a level-up is reverted.
4. Is it small? → 0 runtime dependencies, 532 tests, 31.4 KB gzip.
5. How do I start? → install line, MCP line, quick start, GitHub, live demo.

## Mechanism
Chosen: a replayed real run against souls 0.3.0 on 2026-10-24 with a fixed clock. A Reviewer soul from the README quick start with two traits; six steps: a session shard (not ready), a CI shard (ready), a trait revision with provenance, a level-up plan that forgets a trait (refused), a valid level-up, a revert. A state panel shows level, traits, pending shards and the source gate. Speed: the soul is on screen at load; proof: every value is the library's output; effort: six presses; honesty: labelled as a replay; share value: the rendered identity block before and after.
Rejected: a prompt diff viewer: shows text changes but not why they were allowed.
Rejected: a personality slider page: tone dials are what peers sell (P011 P009) and say nothing about evidence.
Rejected: an Ether template search demo: needs network fetches of prompt catalogues; the core loop is the claim.

## Offer
Product: @ghostpaw/souls, an open-source prompt evolution engine for Node.js on SQLite
Price: free, MIT licence
Delivery: `npm install @ghostpaw/souls` into a Node.js 24+ project, or `npx -y @ghostpaw/souls mcp` as a local MCP server

## Facts
- souls 0.3.0 is on npm with zero runtime dependencies and requires Node.js 24+ for node:sqlite. https://www.npmjs.com/package/@ghostpaw/souls
- The README calls it a prompt evolution engine for cognitive identity, "Not a prompt template library." https://github.com/GhostPawJS/souls
- A soul is an essence plus traits; each trait carries provenance. https://github.com/GhostPawJS/souls
- Shards are observations from any source; crystallization gates refinement until evidence converges across 2+ independent channels over 1+ days. https://github.com/GhostPawJS/souls
- Level-up merges, promotes or carries every active trait and increments the level; it can be reverted. https://github.com/GhostPawJS/souls
- The rendered identity block is static between mutations. https://github.com/GhostPawJS/souls
- Seven tools: search_souls, review_souls, inspect_souls_item, observe_soul, refine_soul, level_up_soul, manage_soul. https://github.com/GhostPawJS/souls
- In the recorded run, three session shards left the soul not ready; one CI shard made it ready with pendingCount 4, sourceDiversity 2, ageSpreadDays 2. https://github.com/GhostPawJS/souls#quick-start
- In the recorded run, a plan that did not carry trait 1 failed validateLevelUpPlan with missingTraitIds [1], and levelUp threw "Level-up plan is invalid. Missing: [1]. Duplicates: []. Invalid: []." https://github.com/GhostPawJS/souls
- In the recorded run, revertLevelUp returned the soul to level 1 with both traits, and the four shards stayed pending after the level-up. https://github.com/GhostPawJS/souls
- 532 tests with 93.39% line, 89.06% branch and 95.85% function coverage, measured 2026-10-24. https://github.com/GhostPawJS/souls
- dist is 31.4 KB gzip and imports in about 2.8 ms on the maintainer box, measured 2026-10-24. https://github.com/GhostPawJS/souls
- SOUL.md is the file people edit to set an agent's personality. V029 V016

## Axes
| Axis | Market | Voices | Chosen |
| --- | --- | --- | --- |
| Opening | "agents that learn", "optimise your prompts" P001 P002 P003 | edits CLAUDE.md after every bad session; rules ignored V002 V008 | open on the prompt change made without a reason |
| Proof | benchmarks, eval dashboards P003 P004 P007 | wants identity versioned and reviewed V043 V045 | a replayed run: the gate, the refusal, the revert |
| Mechanism | automatic optimisation or a hosted prompt registry P003 P007 P008 | SOUL.md as a hand-edited slot V029 V031 | evidence-gated refinement with level-up and revert |
| Palette | white docs or purple gradient SaaS P007 P008 | terminal users who keep markdown files V047 V052 | near-black void, spectral cyan for active traits, wraith violet for pending evidence and absorbed traits, alarm rose for refusals, ward green for ready and reverted |
| Imagery | diagrams of loops, mascots P001 P010 | the agent as a creature with a soul V016 V049 | generated line art: a ghost-wolf head in cyan filaments with shards gathering into a violet crystal |
| Tone | grand claims about souls and consciousness P010 P012 | wary of mysticism V041 V050 | plain, says what is stored and when it may change |

## Sparks
- The CLAUDE.md that keeps growing and still gets ignored. V008 V012 V002
- Delete SOUL.md and the agent goes back to default. V036 V016
- Identity designed by accident. V026 V045
- Personality as infrastructure: versioned, reviewed. V043 V047

## Directions
1. Agents that learn: hero promises an agent that improves itself. V034 → struck: first direction; it is the market opening (P001 P002) and the self-modification voices distrust.
  pushed: a glowing brain icon; any peer.
2. Prompt diff: before and after text with green and red lines. V002 → struck: second direction; diffs show what changed, not why it was allowed.
  pushed: kept as the rendered block before and after level-up.
3. Evidence gate: shards pile up, the gate opens only when two sources agree over time, changes can be refused and reverted. V043 V036 V026 → chosen
  pushed: the state panel shows the source gate filling; the refused plan glows alarm rose; revert returns the old block.
4. Character sheet: an RPG sheet with level and traits. V049 → struck: playful; the library's own demo already does this.
  pushed: the word level stays because the library uses it.
5. Soul file manifesto: an essay on what a soul is. V041 V050 → struck: mystic tone the voices mock.
  pushed: one plain sentence on what a soul is in the library.
6. Template gallery: browse prompts from the Ether catalogue. V019 → struck: network fetches, and templates are what the README says it is not.
  pushed: mentioned in the start section.
7. Eval scoreboard: show a score going up. V048 → struck: souls does not score outputs.
  pushed: none.
8. Plain README page. V001 → struck: market baseline (P005 P009).
  pushed: README one click away.

## Concept
A prompt that changes only when the evidence agrees, and changes back when asked. The page centres on the Reviewer soul from the README. A state panel shows its level, its two traits, how many shards are pending and how many independent sources they come from. The run drops a shard from a session, then one from CI; the source gate fills and the soul is ready (V026 V043). A trait is revised and its reason stays attached. A level-up plan that forgets a trait is refused in alarm rose; the valid plan promotes one trait into the essence and the rendered block changes; revert brings the old block back (V036). The file people patch by hand (V002 V008) gets a history instead.

## Spine
1. Hero: "Change your agent's prompt when the evidence agrees." Subline: essence plus traits with provenance, a source gate, level-up and revert; install and MCP lines; readout; ghost-wolf art. V002 V043
2. The run: the Reviewer soul, six replayed steps. V026 V036
3. Explainer: soul, trait, shard, level-up, the rendered block. V016 V029
4. Worry: self-modification, what souls does and does not do. V022 V034
5. Numbers: 0 deps, Node 24+, 532 tests, 93.4% lines, 31.4 KB gzip, about 2.8 ms import, 7 tools.
6. Start: install, quick start, GitHub, README, live demo, home and sibling pages.
7. Footer: Impressum, Datenschutz.

## Palette
| Role | Color | Source |
| --- | --- | --- |
| void | #04070b | the shared GhostPaw night; prompt tools are white docs P007 P008 |
| panel | #0a1119 | the soul pane and step panes |
| rule | #1d2c3c | pane borders and the HUD grid |
| ghost | #e3edf5 | body text |
| haze | #93a5b9 | secondary text |
| spectral | #62e6f2 | active traits, actions, measured values |
| wraith | #b39dff | pending evidence and traits absorbed into the essence |
| alarm | #ff7aa6 | refused plans |
| ward | #7af0b4 | ready and reverted |

## Type
| Role | Family | Source |
| --- | --- | --- |
| display | Tektur, Bahnschrift, Arial Narrow, sans-serif | the shared GhostPaw HUD face |
| body | system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif | the reader's own sans, no download |
| code | Martian Mono, Cascadia Mono, Consolas, monospace | calls, rendered identity blocks and file names like SOUL.md |

## Form
Shared panes: panel ground, 1px rule border, 14px chamfer, 3px top bar lit by state. The soul pane lists level, traits, pending shards and the source gate as a bar. Steps are an ordered list with call and result. One column on phones; desktop keeps the soul pane beside the steps. Plain void ground with one faint cyan glow.

## Imagery
| Image | Job | Art direction | Source |
| --- | --- | --- | --- |
| hero ghost-wolf | protagonist | a ghost-wolf head drawn in cyan light filaments, small shards floating toward it and one violet crystal forming; no text V016 V049 | generated |
| layers | explanation | stacked glass plates of light with a violet beam and shards rising through them; generations of an identity V043 | generated |
| share card | share preview | the hero art with the headline at 1200×630 | generated art, rendered from HTML |

## Motion
Moment: on first load a single cyan scan line sweeps the hero art once (900 ms).
Feedback: a run step reveals its result and the source gate bar eases (300 ms); the refused plan flashes its border once.
Reduced motion: no sweep or flash; changes in place.

## Copy
- Use: "evidence", "provenance", "revert", "level-up" as the library names them V043 V036
- Show SOUL.md, CLAUDE.md and AGENTS.md as file names in code. V029 V002
- Avoid: "agents that learn", "self-improving", "consciousness" P001 P010 V041
- Avoid: "optimise your prompts" P003
- Plain second person; say the run is a replay. V044
- Never present voices as customers. V051

## Changelog
- 2026-10-24: first concept from the 2026-10-24 research batch (60 voices, 12 peers); evidence gate chosen; replay of a real souls 0.3.0 run.
- 2026-10-24: depth pass (10 more voices, now 70); replay re-run against the current release; import time re-measured; comparison section added; page moved to https://souls.ghostpaw.dev/.
- 2026-10-24: portal chrome pass. Shared top bar (GhostPaw/<lib>, Live demo or Docs, GitHub, npm), version badge, footer row of all seven libraries; sibling links row dropped from the start section; the ruled grid on the page ground was replaced by one radial glow (lfm 0.1.9 rejects ruled ground textures); share card relabelled GhostPaw/<lib> with the install line.
