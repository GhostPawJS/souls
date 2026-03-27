export interface ExplainerEntry {
	summary: string;
	detail: string;
}

export const explainers: Record<string, ExplainerEntry> = {
	roster: {
		summary: 'Your roster of evolving identities, sorted by which need attention first.',
		detail:
			'Each card represents a soul -- a structured identity that evolves from behavioral evidence. ' +
			'Souls that glow are ready for refinement: enough observations have accumulated from diverse sources. ' +
			'Dormant souls are greyed out at the bottom. Click any card to inspect its full character sheet.',
	},
	'detail/identity': {
		summary: 'The rendered identity block -- what an LLM sees as its system prompt.',
		detail:
			"This is the exact text that would be injected into an agent's context. It combines the soul's " +
			'essence (core identity paragraph) with active traits ordered by evidence strength. ' +
			"The identity is static between mutations -- it doesn't drift from conversation context.",
	},
	'detail/traits': {
		summary: 'Active behavioral principles discovered from evidence.',
		detail:
			'Traits are concrete behavioral rules extracted from observations. Each has a principle (the rule) ' +
			"and provenance (why it was added). Traits with a yellow border haven't been cited by new evidence " +
			'in 90+ days and may need review. The count shows how close this soul is to its trait limit.',
	},
	'detail/health': {
		summary:
			'A composite health score combining freshness, capacity headroom, and evidence availability.',
		detail:
			'Health = (1 - staleness) x (1 - capacity usage) x min(1, evidence ratio). ' +
			'High health means the soul has fresh traits, room to grow, and enough evidence flowing in. ' +
			'Low health signals stale traits, full capacity, or insufficient observations.',
	},
	'detail/shards': {
		summary: 'Pending behavioral observations waiting to inform the next refinement.',
		detail:
			'Shards are raw observations about behavior -- things the soul did, outcomes of delegations, ' +
			'user feedback. They accumulate until crystallization conditions are met, then an evidence report ' +
			'can be generated to guide trait mutations. Sealed shards cannot be modified after deposit.',
	},
	'detail/levels': {
		summary: "The soul's evolution history -- each level-up is a consolidation milestone.",
		detail:
			"When a soul's traits reach capacity, level-up consolidates related traits into fewer, more mature " +
			'principles and optionally promotes key knowledge into the core essence. The before/after diff shows ' +
			'exactly how the identity transformed at each milestone.',
	},
	observe: {
		summary: 'Deposit behavioral observations that feed into soul refinement.',
		detail:
			'Every observation becomes a shard attributed to one or more souls. Specify the source ' +
			'(session, delegation, feedback, etc.) and optional tags. When enough diverse shards accumulate, ' +
			'crystallization triggers and the soul becomes ready for evidence-based refinement.',
	},
	'refine/evidence': {
		summary: 'The evidence report clusters observations and maps them to existing traits.',
		detail:
			'Clusters group similar observations by content similarity. Each cluster shows its weight, source ' +
			'diversity, and whether it reinforces an existing trait or reveals something novel. Trait signals ' +
			'show citation density and staleness. Tensions highlight contradictory principles.',
	},
	'refine/actions': {
		summary: 'Mutate the soul: add new traits, revise existing ones, or revert mistakes.',
		detail:
			'Add creates a new behavioral principle with provenance explaining why. Revise updates an existing ' +
			"trait's principle or provenance. Revert removes a trait that proved wrong. Cite links a shard " +
			'to a trait as supporting evidence. Stamp marks the soul as freshly attuned.',
	},
	'levelup/gate': {
		summary: 'Crystallization conditions that must be met before leveling up.',
		detail:
			'The gate ensures level-ups are evidence-driven: enough shards from diverse sources, spanning ' +
			'sufficient time, forming distinct content clusters. A recent shard proves ongoing observation. ' +
			'These conditions prevent premature or unfounded consolidation.',
	},
	'levelup/planner': {
		summary:
			'Assign each trait a disposition: consolidate related ones, promote key ones, or carry the rest.',
		detail:
			'Consolidation merges 2+ related traits into a single more mature principle. Promotion absorbs ' +
			"a trait's knowledge into the core essence paragraph. Carry keeps a trait as-is for the next " +
			'generation. Every active trait must be assigned exactly once.',
	},
	maintenance: {
		summary: 'Housekeeping: fade exhausted shards and identify souls ready for refinement.',
		detail:
			'Maintenance fades shards that have been cited by enough distinct traits (their evidence has been ' +
			'absorbed). It also scans all active souls for crystallization readiness, surfacing which ones ' +
			'have enough accumulated evidence to warrant a refinement pass.',
	},
	search: {
		summary: 'Full-text search across all shard content using SQLite FTS5.',
		detail:
			'Search finds observations by content keywords. Results show the matching shard text, its source, ' +
			'attributed souls, and tags. Use this to find specific evidence or explore patterns across all ' +
			'deposited observations.',
	},
	create: {
		summary: 'Bootstrap a new soul with a name, essence, and description.',
		detail:
			'The essence is the core identity paragraph -- the foundational "who is this" text that gets ' +
			'injected into system prompts. The description is a brief human-facing label. Traits will be ' +
			'added later through the refinement process as behavioral evidence accumulates.',
	},
	ether: {
		summary:
			'The Ether is a searchable collection of soul templates from open-source prompt libraries.',
		detail:
			'Search by keyword across thousands of system prompts from Awesome ChatGPT Prompts and the ' +
			'Rosehill System Prompt Library. Browse results, inspect full system prompts, and manifest any ' +
			'entry as a living soul in your workshop with one click.',
	},
	'ether/detail': {
		summary: 'Inspect a soul template from the ether before manifesting it.',
		detail:
			"This shows the full system prompt text, source, and category. Click 'Manifest as Soul' to " +
			'bring this template into existence as a real soul in your workshop. The system prompt becomes ' +
			"the soul's essence, and you can refine it further with observations and traits.",
	},
};
