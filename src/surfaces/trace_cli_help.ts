const dates = 'ISO, YYYY-MM-DD, DD.MM.YYYY, today, tomorrow, yesterday, +Nd, +Nh, epoch ms';
const verbs: Record<string, [string, string, string]> = {
	record: [
		'Record a fact or commitment.',
		'soul tag due weight supersedes created-at settled reason at tz',
		'"Reviewed the draft" --soul mentor:owner --tag event --settled done --reason "Delivered comments"',
	],
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
		'soul role state tag due-before query limit offset include-retired include-superseded tz',
		'--soul mentor --tag promise --state open',
	],
	due: [
		'List open due or overdue traces.',
		'soul role tag within limit offset include-retired include-superseded tz',
		'--soul mentor --within 3d',
	],
	show: ['Show one trace and its evidence.', '', '4'],
	history: ['Show ordered immutable revisions.', '', '4'],
	chain: ['Show a supersedes chain and certainty.', '', '4'],
	changed: ['Review store changes since a date.', 'since tz', '--since yesterday'],
	stats: [
		'Compute overdue, settlement, certainty and decay statistics.',
		'soul with half-life-days include-retired tz',
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
	'created-at': [`date (${dates})`, 'When the fact happened.'],
	at: [`date (${dates})`, 'Settlement time; on record also defaults creation time.'],
	since: [`date (${dates})`, 'Exclusive start of the change window.'],
	weight: ['number 0..1 or none', 'Certainty or importance; none clears it.'],
	supersedes: ['integer trace id', 'Earlier trace corrected by this trace.'],
	settled: ['done|dropped', 'Record and settle atomically, with two revisions.'],
	as: ['done|dropped', 'Closing state.'],
	reason: ['string', 'Honest outcome or explanation for the change.'],
	text: ['string', 'Replacement fact or commitment.'],
	tz: ['string', 'IANA time zone for calendar dates.'],
	role: ['owner|counterpart|subject|0|1|2', 'Filter linked role.'],
	state: ['open|done|dropped', 'Filter state; omitted includes every state.'],
	query: ['string', 'Case insensitive text substring.'],
	limit: ['integer', 'Maximum results (default 100).'],
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
