const dates = 'ISO, YYYY-MM-DD, DD.MM.YYYY, today, tomorrow, yesterday, +Nd, +Nh, epoch ms';
const verbs: Record<string, [string, string, string]> = {
	record: [
		'Record a fact or commitment.',
		'soul tag due weight supersedes created-at updated-at import settled reason at tz batch',
		'"Reviewed the draft" --soul mentor:owner --tag event --settled done --reason "Delivered comments"',
	],
	roll: [
		'Settle and record the next open trace atomically.',
		'next-due as reason at text tz',
		'4 --next-due +7d',
	],
	compact: ['Deduplicate revision text explicitly.', 'dry-run vacuum', '--dry-run'],
	revise: [
		'Revise a trace and preserve its history.',
		'text due weight supersedes reason tz',
		'4 --due +3d --reason "Date moved"',
	],
	settle: [
		'Close an existing trace.',
		'as reason at tz',
		'4 --as done --reason "Delivered the review"',
	],
	link: ['Add soul links.', 'soul reason', '4 --soul fox:counterpart'],
	unlink: [
		'Remove soul links, retaining at least one.',
		'soul reason',
		'4 --soul fox:counterpart --reason "Wrong party"',
	],
	tag: ['Add category tags.', 'tag reason', '4 --tag promise'],
	untag: ['Remove category tags.', 'tag reason', '4 --tag promise --reason "Wrong category"'],
	cite: ['Cite a trace from a shard.', 'reason', '12 4'],
	list: [
		'List all states, newest updated first.',
		'soul role state tag tag-prefix exclude-tag due-before query limit all offset include-retired include-superseded tz',
		'--soul mentor --tag promise --state open',
	],
	due: [
		'List open due or overdue traces.',
		'soul role tag tag-prefix exclude-tag within limit all offset include-retired include-superseded tz',
		'--soul mentor --within 3d',
	],
	show: ['Show one trace and its evidence.', '', '4'],
	history: ['Show ordered immutable revisions.', '', '4'],
	chain: ['Show a supersedes chain and certainty.', '', '4'],
	changed: ['Review store changes since a date.', 'since limit all offset tz', '--since yesterday'],
	stats: [
		'Compute overdue, settlement, certainty and decay statistics.',
		'soul with half-life-days tag tag-prefix exclude-tag limit all include-retired tz',
		'--soul mentor --with fox --half-life-days 30',
	],
};
const flags: Record<string, [string, string]> = {
	soul: [
		'string (repeatable)',
		'Soul reference; writes accept :owner, :counterpart, :subject or :0, :1, :2.',
	],
	tag: ['string (repeatable)', 'Category tag.'],
	due: [`date (${dates}) or none`, 'Due time; none clears it.'],
	'due-before': [`date (${dates})`, 'Latest due time.'],
	batch: ['path|-', 'Record JSONL atomically; errors identify the line.'],
	'next-due': [`date (${dates})`, 'Due date for the next open trace.'],
	'updated-at': [`date (${dates})`, 'Historical update time with --import.'],
	import: ['boolean', 'Preserve historical update time (default created-at).'],
	'dry-run': ['boolean', 'Report compaction without writing.'],
	vacuum: ['boolean', 'Vacuum after explicit compaction.'],
	all: ['boolean', 'Return all results.'],
	'exclude-tag': ['string (repeatable)', 'Exclude traces carrying this category.'],
	'tag-prefix': ['string', 'Match a literal category prefix.'],
	'created-at': [`date (${dates})`, 'When the fact happened.'],
	at: [`date (${dates})`, 'Settlement time, independent of created-at.'],
	since: [`date (${dates})`, 'Exclusive start of the change window.'],
	weight: ['number 0..1 or none', 'Certainty or importance; none clears it.'],
	supersedes: [
		'integer trace id',
		'Repeat or comma separate ids: primary parent first, then merge parents.',
	],
	settled: ['done|dropped', 'Record and settle atomically, with two revisions.'],
	as: ['done|dropped', 'Closing state.'],
	reason: ['string', 'Honest outcome or explanation for the change.'],
	text: ['string', 'Replacement fact or commitment.'],
	tz: ['string', 'IANA time zone for calendar dates.'],
	role: ['owner|counterpart|subject|0|1|2', 'Filter linked role.'],
	state: ['open|done|dropped', 'Filter state; omitted includes every state.'],
	query: ['string', 'Case insensitive text substring.'],
	limit: ['integer', 'Maximum results (default 100; stats heads 20).'],
	offset: ['integer', 'Number of results to skip.'],
	within: ['string', 'Due window, such as 3d or 12h.'],
	'include-retired': ['boolean', 'Include retired souls.'],
	'include-superseded': ['boolean', 'Include chain ancestors.'],
	with: ['string', 'Other soul for promise settlement statistics.'],
	'half-life-days': ['number', 'Positive decay half life (default 30 days).'],
	db: ['path', 'Database path.'],
	json: ['boolean', 'Print structured output.'],
	quiet: ['boolean', 'Suppress stdout.'],
	compact: ['boolean', 'Print compact JSON.'],
	help: ['boolean', 'Show this help.'],
};
export function traceCliHelp(bin: string, verb?: string): string | undefined {
	if (!verb)
		return `${bin} trace\n\n${Object.entries(verbs)
			.map(([name, [purpose]]) => `  ${name.padEnd(9)} ${purpose}`)
			.join('\n')}\n`;
	const spec = verbs[verb];
	if (!spec) return undefined;
	const [purpose, names, example] = spec;
	return `${bin} trace ${verb}\n${purpose}\n\nFlags:\n${`${names} db json quiet compact help`
		.trim()
		.split(/\s+/)
		.map((name) => {
			const [type, description] = flags[name] as [string, string];
			return `  --${name} <${type}>  ${description}`;
		})
		.join('\n')}\n\nExample: ${bin} trace ${verb} ${example} --json\n`;
}
