import type { ToolCliOptions } from './cli.ts';
import {
	type CliArgument,
	type CliSpec,
	CliUsageError,
	parseCliArgs,
	renderCliHelp,
} from './cli_args.ts';
import { cliVersion } from './cli_version.ts';
import type { JsonSchema, SurfaceTool } from './surface_types.ts';
import { traceCliHelp } from './trace_cli_help.ts';
import { validateInput } from './validate_input.ts';

export function cliCommands<T>(tools: readonly SurfaceTool<T>[]) {
	return tools.flatMap((tool) => {
		const split = tool.name.indexOf('_');
		const cli = tool.cli ?? { noun: tool.name.slice(split + 1), verb: tool.name.slice(0, split) };
		const action =
			cli.action ??
			(tool.inputSchema.properties?.action?.enum ? { property: 'action' } : undefined);
		const actions = action
			? (tool.inputSchema.properties?.[action.property]?.enum ?? [])
			: [undefined];
		return actions.map((value) => {
			const verb =
				value === undefined ? cli.verb : (action?.verbs?.[String(value)] ?? String(value));
			return {
				tool,
				path: [cli.noun, verb].filter(Boolean).join(' '),
				fixed: action && value !== undefined ? { [action.property]: value } : {},
				positionals: action?.positionals?.[String(value)] ?? cli.positionals ?? [],
			};
		});
	});
}
export async function runCliCommand<T>(
	argv: string[],
	options: ToolCliOptions<T>,
): Promise<number | undefined> {
	argv = argv.map((arg) => (arg === '-q' ? '--quiet' : arg));
	const stdout = options.stdout ?? process.stdout;
	const stderr = options.stderr ?? process.stderr;
	const stdin = options.stdin ?? process.stdin;
	const args = [...argv];
	const tree = cliCommands(options.tools);
	const review = tree.find((entry) => entry.tool.name === 'review_souls');
	if (review) tree.push({ ...review, path: 'soul list', fixed: { view: 'list' }, positionals: [] });
	const drop = tree.find((entry) => entry.path === 'shard drop');
	if (drop) {
		tree.push({ ...drop, path: 'shard add' });
		tree.push({ ...drop, path: 'shard observe' });
	}
	let json = argv.includes('--json'),
		quiet = argv.includes('--quiet'),
		compact = false,
		help = false;
	let db: string | undefined;
	const fail = (message: string, code: number) => {
		stderr.write(`${message}\n`);
		if (json && !quiet)
			stdout.write(
				`${JSON.stringify({ ok: false, error: { code: code === 2 ? 'usage_error' : 'internal_error', message } })}\n`,
			);
		return code;
	};
	const legacy = ['tools', 'describe', 'call', 'mcp', 'skill'];
	let first: string | undefined;
	for (let i = 0; i < argv.length; i++) {
		const token = argv[i] as string;
		if (token === '--db') {
			i++;
			continue;
		}
		if (token.startsWith('-')) continue;
		first = token;
		break;
	}
	if (
		legacy.includes(first ?? '') ||
		options.tools.some((tool) => tool.name.replace(/[-_]/g, '') === first?.replace(/[-_]/g, ''))
	)
		return undefined;
	try {
		for (let i = 0; i < args.length; i++) {
			const flag = args[i];
			if (flag === '--') break;
			if (flag === '--db' || flag?.startsWith('--db=')) {
				db = flag === '--db' ? args.splice(i + 1, 1)[0] : flag.slice(5);
				if (!db || db.startsWith('--')) throw new CliUsageError('--db requires a path');
			} else if (flag === '--json') json = true;
			else if (flag === '--quiet') quiet = true;
			else if (flag === '--compact') compact = true;
			else if (flag === '--help' || flag === '-h') help = true;
			else if (['--version', '-V', '-v'].includes(flag ?? '')) {
				if (!quiet) stdout.write(`${cliVersion(options.version)}\n`);
				return 0;
			} else if (flag !== '--no-color') continue;
			args.splice(i--, 1);
		}
		if (args[0] === 'version') {
			if (!quiet) stdout.write(`${cliVersion(options.version)}\n`);
			return 0;
		}
		if (args[0] === 'help') {
			help = true;
			args.shift();
		}
		if (!args.length) help = true;
		if (
			args[0] === 'shard' &&
			args[1] === 'add' &&
			args.some((a) => a === '--batch' || a.startsWith('--batch='))
		) {
			args[1] = 'drop-batch';
			for (let i = 2; i < args.length; i++) {
				if (args[i] === '--batch') args[i] = '--shards';
				else if (args[i]?.startsWith('--batch='))
					args[i] = args[i]?.replace('--batch=', '--shards=') as string;
			}
		}
		const entry = tree.find((command) =>
			command.path.split(' ').every((part, i) => args[i] === part),
		);
		const specFor = (command: (typeof tree)[number]): CliSpec => {
			const argument = (name: string, schema: JsonSchema): CliArgument => ({
				name,
				type:
					Array.isArray(schema.type) && schema.type.includes('array')
						? 'array'
						: schema.type === 'array' && schema.items?.type === 'object'
							? 'json'
							: schema.oneOf?.some((b) => b.type === 'string')
								? 'string'
								: schema.type === 'object' || !schema.type
									? 'json'
									: (schema.type as CliArgument['type']),
				description: schema.description,
				...(schema.type === 'array' && schema.items?.type === 'object' ? { jsonLines: true } : {}),
				enum: schema.enum,
				...(command.tool.cli?.fileArgs?.includes(
					name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()),
				)
					? { file: true }
					: {}),
				...(schema.items?.type ? { itemType: schema.items.type as CliArgument['type'] } : {}),
			});
			const inputSchema = help
				? (command.tool.cli?.helpInputSchema ?? command.tool.inputSchema)
				: command.tool.inputSchema;
			const properties = inputSchema.properties ?? {};
			return {
				command: `${options.bin} ${command.path}`,
				description:
					command.tool.description +
					(command.path.startsWith('refinement ')
						? '\nrevise <traitId> changes wording; revert <traitId> deactivates the trait and does not restore previous wording.'
						: '') +
					(command.path === 'shard add'
						? '\nBatch import: shard add --batch @file (JSON array or JSON Lines); or shard drop-batch --shards @file.'
						: '') +
					'\nGlobal flags: --busy-timeout <ms> (GHOSTPAW_SOULS_BUSY_TIMEOUT; default 5000), --timings (GHOSTPAW_SOULS_TIMINGS=1), --json, -q, --quiet. Array flags can be repeated or accept a JSON array; commas are literal.',
				positionals: command.positionals.map((name) => ({
					...argument(name, properties[name] ?? {}),
					...(properties[name]?.type === 'array'
						? {
								type: (properties[name]?.items?.type as CliArgument['type']) ?? 'string',
								variadic: true,
							}
						: {}),
				})),
				flags: Object.entries(properties)
					.filter(([name]) => !(name in command.fixed))
					.map(([name, schema]) => ({
						...argument(
							name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
							schema,
						),
						required: false,
						description: `${schema.description ?? ''}${inputSchema.required?.includes(name) ? ' (required)' : ''}`,
					})),
			};
		};
		if (help && args[0] === 'trace') {
			const text = traceCliHelp(options.bin, args[1]);
			if (!text) throw new CliUsageError(`Unknown trace verb: ${args[1]}`);
			if (!quiet) stdout.write(text);
			return 0;
		}
		if (help) {
			const matches = tree.filter((command) => command.path.startsWith(args.join(' ')));
			if (!matches.length) throw new CliUsageError(`Unknown command: ${args.join(' ')}`);
			if (!quiet)
				stdout.write(
					entry
						? renderCliHelp(specFor(entry))
						: `${options.bin} ${options.version}\n${options.description}\n\nCommands:\n${matches.map((command) => `  ${command.path}`).join('\n')}\n  mcp, skill, tools [--json], describe <tool>, call <tool> [JSON|-], completions <bash|zsh|fish>, version\n${options.customCommand && !args.length ? 'Host commands: render, diff, config, report; review <soul> --no-change (see command --help)\n' : ''}Global flags: --busy-timeout <ms> (GHOSTPAW_SOULS_BUSY_TIMEOUT; default 5000), --timings (GHOSTPAW_SOULS_TIMINGS=1), --db <path>, --json, -q, --quiet, --compact, --help/-h, --version/-V/-v, --no-color\nVersion formats: --version --short, --version --json\n`,
				);
			return 0;
		}
		if (args[0] === 'completions') {
			const shell = args[1];
			if (!['bash', 'zsh', 'fish'].includes(shell ?? ''))
				throw new CliUsageError('Expected completion shell: bash, zsh or fish');
			if (quiet) return 0;
			const words = [...new Set(tree.flatMap((command) => command.path.split(' ')))].concat([
				'mcp',
				'skill',
				'tools',
				'describe',
				'call',
				'completions',
				'version',
			]);
			if (shell === 'bash') stdout.write(`complete -W '${words.join(' ')}' ${options.bin}\n`);
			else if (shell === 'zsh')
				stdout.write(`#compdef ${options.bin}\n_arguments '*:command:(${words.join(' ')})'\n`);
			else if (shell === 'fish')
				stdout.write(`complete -c ${options.bin} -f -a '${words.join(' ')}'\n`);
			else throw new CliUsageError('Expected completion shell: bash, zsh or fish');
			return 0;
		}
		if (!entry) throw new CliUsageError(`Unknown command: ${args.join(' ')}`);
		const rest = args.slice(entry.path.split(' ').length);
		let base: unknown = {};
		const spec = specFor(entry);
		const positionalIndexes: number[] = [];
		let ended = false;
		for (let i = 0; i < rest.length; i++) {
			const token = rest[i] as string;
			if (!ended && token === '--') {
				ended = true;
				continue;
			}
			if (!ended && token.startsWith('--')) {
				const flag = spec.flags?.find((arg) => `--${arg.name}` === token);
				if (!token.includes('=') && flag && flag.type !== 'boolean') i++;
			} else positionalIndexes.push(i);
		}
		const stdinIndex =
			positionalIndexes.length === 1 && rest[positionalIndexes[0] as number] === '-'
				? positionalIndexes[0]
				: undefined;
		if (stdinIndex !== undefined || (!rest.length && !stdin.isTTY)) {
			if (stdinIndex !== undefined) rest.splice(stdinIndex, 1);
			let raw = '';
			for await (const chunk of stdin) raw += String(chunk);
			try {
				base = raw.trim() ? JSON.parse(raw) : {};
			} catch {
				throw new CliUsageError('Invalid stdin JSON');
			}
			if (!base || typeof base !== 'object' || Array.isArray(base))
				throw new CliUsageError('Expected stdin JSON object');
		}
		// File values use the injected stream as well as the process stdin.
		for (let i = 0; i < rest.length; i++) {
			const token = rest[i] as string;
			const flag = spec.flags?.find(
				(arg) => arg.file && (token === `--${arg.name}` || token.startsWith(`--${arg.name}=`)),
			);
			if (!flag) continue;
			const inline = token.includes('=');
			const raw = inline ? token.slice(token.indexOf('=') + 1) : rest[i + 1];
			if (raw !== '@-') continue;
			let text = '';
			for await (const chunk of stdin) text += String(chunk);
			const literal = text.startsWith('@') ? `@${text}` : text;
			if (inline) rest[i] = `--${flag.name}=${literal}`;
			else rest[i + 1] = literal;
		}
		const input: Record<string, unknown> = {
			...(base as object),
			...parseCliArgs(rest, {
				...spec,
				positionals: (spec.positionals ?? []).map((arg) =>
					options.resolveReference && arg.name === 'soulId'
						? { ...arg, type: 'string' as const }
						: arg,
				),
				flags: (spec.flags ?? []).map((arg) =>
					options.resolveReference && ['soul-id', 'soul-ids'].includes(arg.name)
						? {
								...arg,
								...(arg.type === 'array'
									? { itemType: 'string' as const }
									: { type: 'string' as const }),
							}
						: arg,
				),
			}),
			...entry.fixed,
		};
		options.prepareInput?.(input, entry.tool.name);
		const context = await options.openContext(db === undefined ? {} : { db });
		try {
			if (options.resolveReference) {
				const convert = (ref: unknown) =>
					typeof ref === 'string' ? options.resolveReference?.(context, ref) : ref;
				if (input.soulId !== undefined) input.soulId = convert(input.soulId);
				if (Array.isArray(input.soulIds)) input.soulIds = input.soulIds.map(convert);
			}
			const errors = validateInput(entry.tool.inputSchema, input);
			if (errors.length) {
				let recovery = '';
				if (entry.path.startsWith('trace ')) {
					const invalid = (await entry.tool.handler(context, input)) as {
						error?: { recovery?: string };
					};
					recovery = invalid.error?.recovery ?? '';
				}
				throw new CliUsageError([...errors, ...(recovery ? [recovery] : [])].join('\n'));
			}
			const result = await entry.tool.handler(context, input);
			const record = result as {
				ok?: boolean;
				outcome?: string;
				error?: { code?: string; message?: string };
				summary?: string;
				data?: unknown;
			};
			const warningMessages = new Set<string>();
			function collectWarnings(value: unknown): void {
				if (!value || typeof value !== 'object') return;
				for (const [key, child] of Object.entries(value)) {
					if (key === 'warnings' && Array.isArray(child))
						for (const warning of child) {
							const message = typeof warning === 'string' ? warning : warning?.message;
							if (typeof message === 'string') warningMessages.add(message);
						}
					else if (key === 'data' || key === 'trait' || key === 'soul' || key === 'result')
						collectWarnings(child);
				}
			}
			collectWarnings(result);
			const page = (record.data && !Array.isArray(record.data) ? record.data : result) as {
				truncated?: boolean;
				total?: number;
				next?: unknown;
				headsTruncated?: boolean;
				headsTotal?: number;
			};
			if (page.truncated || page.headsTruncated)
				stderr.write(
					`Results truncated (${page.total ?? page.headsTotal} total); use --all or --limit with --offset to continue.\n`,
				);
			const essenceNote =
				record.ok &&
				entry.tool.name === 'manage_soul' &&
				input.action === 'update' &&
				input.essence !== undefined &&
				input.operator &&
				!(input.shardIds as unknown[] | undefined)?.length;
			if (essenceNote && warningMessages.size)
				stderr.write(
					`note: soul essence updated; no shards were linked (${[...warningMessages].map((w) => w.replace(/\s+/g, ' ')).join(' ')})\n`,
				);
			else
				for (const warning of warningMessages)
					stderr.write(`warning: ${warning.replace(/\s+/g, ' ')}\n`);

			const code =
				record.outcome === 'needs_clarification' || record.error?.code === 'not_found'
					? 3
					: ['conflict', 'version_mismatch'].includes(record.error?.code ?? '')
						? 4
						: record.error?.code === 'invalid_input' &&
								entry.tool.name === 'manage_soul' &&
								/Soul essence/.test(record.error.message ?? '')
							? 2
							: record.ok === false
								? 1
								: 0;
			if (code) stderr.write(`${record.error?.message ?? record.summary ?? 'Tool failed'}\n`);
			if (!quiet)
				stdout.write(
					json || !(stdout as { isTTY?: boolean }).isTTY
						? `${JSON.stringify(entry.tool.name === 'trace_soul' && record.ok && record.data && typeof record.data === 'object' ? { ...(result as object), id: (record.data as { id: number }).id, ...('shardId' in record.data ? { shardId: record.data.shardId } : {}) } : result, null, compact ? undefined : 2)}\n`
						: `${record.summary ?? ''}\n${JSON.stringify(record.data ?? {}, null, 2)}\n`,
				);
			return code;
		} finally {
			await options.closeContext?.(context);
		}
	} catch (error) {
		return fail(
			error instanceof Error ? error.message : String(error),
			error instanceof CliUsageError
				? 2
				: error instanceof Error && error.name === 'SoulsNotFoundError'
					? 3
					: 70,
		);
	}
}
