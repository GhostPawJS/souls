import { readFileSync } from 'node:fs';
import { getSoulsConfig, resolveStrict, setSoulsConfig } from '../config.ts';
import type { SoulsDb } from '../database.ts';
import { SoulsConflictError } from '../errors.ts';
import { diffSoul, publishSoul, renderPublication } from '../publication.ts';
import { reviewNoChange } from '../review.ts';
import { getRevisionHistory } from '../revisions.ts';
import { resolveSoulReference } from '../souls/resolve_soul_reference.ts';
import type { ToolCliOptions } from '../surfaces/cli.ts';
import { type CliArgument, CliUsageError, parseCliArgs } from '../surfaces/cli_args.ts';

export { resolveSoulReference } from '../souls/resolve_soul_reference.ts';
export async function runHostCommand(
	argv: string[],
	options: ToolCliOptions<SoulsDb>,
): Promise<number | undefined> {
	argv = argv.map((arg) => (arg === '-q' ? '--quiet' : arg));
	const args = argv.filter((a) => !['--json', '--quiet', '--no-color', '--compact'].includes(a));
	let path: string | undefined;
	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--db') {
			path = args[i + 1];
			args.splice(i, 2);
			i--;
		} else if (args[i]?.startsWith('--db=')) {
			path = args[i]?.slice(5);
			args.splice(i, 1);
			i--;
		}
	}
	const command = args[0];
	const specialReview =
		command === 'review' &&
		args[1] &&
		!args[1].startsWith('-') &&
		!['list', 'maintenance', 'readiness'].includes(args[1]);
	if (!['render', 'diff', 'config', 'report'].includes(command ?? '') && !specialReview)
		return undefined;
	const out = options.stdout ?? process.stdout,
		err = options.stderr ?? process.stderr;
	const json = argv.includes('--json'),
		quiet = argv.includes('--quiet');
	const help = `render <soul> [--budget chars] [--provenance|--no-provenance] [--order citations|density] [--into file] [--marker souls] [--expect-hash sha256|none]\ndiff <soul> --against file|- [--marker souls] (exit 0 same, 1 different; without the requested marker block, compare the whole input minus one trailing newline)\nreview <soul> [--no-change] [--reason text]\nconfig set strict true|false | config get [key] | config list\nreport --expect-ids @file|@- (exit 0 matching, 1 different)\nUse --json for structured output. Soul references accept IDs, ext:<id>, slugs, and names (in that order). -q, --quiet suppresses stdout.\n`;
	if (args.includes('--help') || args.includes('-h')) {
		if (!quiet) out.write(help);
		return 0;
	}
	let db: SoulsDb | undefined;
	try {
		db = await options.openContext(path === undefined ? {} : { db: path });
		const write = (value: unknown, text: string) => {
			if (!quiet) out.write(json ? `${JSON.stringify(value)}\n` : text);
		};
		if (command === 'config') {
			const rest = args.slice(1).filter((a) => !['--json', '--quiet'].includes(a));
			const [action, key, value] = rest;
			if (action === 'set') {
				if (rest.length !== 3) throw new Error('Expected config set strict true|false.');
				setSoulsConfig(db, key ?? '', value ?? '');
			} else if (
				!['get', 'list'].includes(action ?? '') ||
				rest.length > (action === 'get' ? 2 : 1)
			)
				throw new Error('Expected config set|get|list.');
			const all = getSoulsConfig(db);
			const env = process.env.GHOSTPAW_SOULS_STRICT?.toLowerCase();
			const source = ['1', 'true', 'yes', '0', 'false', 'no'].includes(env ?? '')
				? 'env'
				: all.strict !== undefined
					? 'db'
					: 'default';
			const strict = resolveStrict(db);
			const config = key && key !== 'strict' ? { [key]: all[key] ?? '' } : { strict, source };
			write(
				config,
				key && key !== 'strict' ? `${key}: ${all[key] ?? ''}\n` : `strict: ${strict} (${source})\n`,
			);
			return 0;
		}
		const flags: CliArgument[] = [
			{ name: 'json', type: 'boolean' },
			{ name: 'quiet', type: 'boolean' },
			{ name: 'marker', type: 'string' },
			{ name: 'budget', type: 'integer' },
			{ name: 'provenance', type: 'boolean' },
			{ name: 'order', type: 'string', enum: ['citations', 'density'] },
			{ name: 'traces', type: 'string', enum: ['open', 'due'] },
			{ name: 'into', type: 'string' },
			{ name: 'expect-hash', type: 'string' },
			{ name: 'against', type: 'string' },
			{ name: 'no-change', type: 'boolean' },
			{ name: 'reason', type: 'string' },
			{ name: 'expect-ids', type: 'string' },
		];
		// no-change is a literal flag, rather than the negation of a change option.
		const rest = args.slice(1).map((a) => (a === '--no-change' ? '--record-review' : a));
		flags.push({ name: 'record-review', type: 'boolean' });
		const input = parseCliArgs(rest, {
			command: command ?? '',
			flags,
			positionals: command === 'report' ? [] : [{ name: 'soul', type: 'string', required: true }],
		});
		if (command === 'report') {
			const file = input.expectIds as string;
			if (!file?.startsWith('@')) throw new Error('Expected --expect-ids @file or @-.');
			let raw = '';
			if (file === '@-') {
				for await (const chunk of options.stdin ?? process.stdin) raw += String(chunk);
			} else raw = readFileSync(file.slice(1), 'utf8');
			const expected = new Set(
				raw
					.split(/\r?\n/)
					.map((s) => s.trim())
					.filter(Boolean),
			);
			const actual = new Set(
				db
					.prepare(
						'SELECT external_id FROM souls WHERE external_id IS NOT NULL AND deleted_at IS NULL',
					)
					.all<{ external_id: string }>()
					.map((r) => r.external_id),
			);
			const missing = [...expected].filter((id) => !actual.has(id)).sort(),
				extra = [...actual].filter((id) => !expected.has(id)).sort();
			write({ missing, extra }, `missing: ${missing.join(', ')}\nextra: ${extra.join(', ')}\n`);
			return missing.length || extra.length ? 1 : 0;
		}
		const soulId = resolveSoulReference(db, input.soul as string);
		if (command === 'review') {
			if (input.recordReview)
				reviewNoChange(db, soulId, { reason: input.reason as string | undefined });
			const history = getRevisionHistory(db, { soulId });
			const reviews = db
				.prepare(
					'SELECT id, soul_id AS soulId, reason, created_at AS createdAt FROM soul_reviews WHERE soul_id=? ORDER BY id DESC',
				)
				.all(soulId);
			const rows = [
				...history.map((r) => ({
					...r,
					review: false,
					text: `#${r.id} ${r.entity} ${r.reason ?? ''}${r.operator ? ` (${r.operator})` : ''}\n`,
				})),
				...reviews.map((r) => ({
					createdAt: Number(r.createdAt),
					review: true,
					id: Number(r.id),
					text: `#${r.id} review no change: ${r.reason ?? ''}\n`,
				})),
			].sort(
				(a, b) => b.createdAt - a.createdAt || Number(b.review) - Number(a.review) || b.id - a.id,
			);
			write(
				{ history, reviews },
				`${input.recordReview ? 'reviewed\n' : ''}${rows.map((r) => r.text).join('')}`,
			);
			return 0;
		}
		if (command === 'diff') {
			if (!input.against) throw new Error('--against is required.');
			let stdinText: string | undefined;
			if (input.against === '-') {
				stdinText = '';
				for await (const chunk of options.stdin ?? process.stdin) stdinText += String(chunk);
			}
			const result = diffSoul(
				db,
				soulId,
				input.against as string,
				input.marker as string | undefined,
				stdinText,
			);
			write(
				{
					same: result.same,
					added: result.added,
					removed: result.removed,
					markerFound: result.markerFound,
				},
				result.lines.length
					? `--- ${input.against}\n+++ current\n${result.lines.join('\n')}\n`
					: '',
			);
			return result.same ? 0 : 1;
		}
		const opts = {
			traces: input.traces as 'open' | 'due' | undefined,
			budget: input.budget as number | undefined,
			order: input.order as 'citations' | 'density' | undefined,
			includeProvenance: input.provenance as boolean | undefined,
			marker: input.marker as string | undefined,
			expectHash: input.expectHash as string | undefined,
		};
		const result = input.into
			? publishSoul(db, soulId, { ...opts, into: input.into as string })
			: renderPublication(db, soulId, opts);
		if (result.trimmed.traitIds.length || result.trimmed.essenceChars)
			err.write(
				`trimmed: ${result.trimmed.traitIds.length} traits (ids ${result.trimmed.traitIds.join(', ')})${result.trimmed.essenceChars ? ', essence shortened' : ''}\n`,
			);
		write(
			{
				text: result.text,
				trimmed: result.trimmed,
				...('fileHash' in result ? { fileHash: result.fileHash } : {}),
			},
			'fileHash' in result ? `wrote ${input.into} sha256:${result.fileHash}\n` : result.text,
		);
		return 0;
	} catch (error) {
		err.write(`${error instanceof Error ? error.message : String(error)}\n`);
		return error instanceof CliUsageError ? 2 : error instanceof SoulsConflictError ? 4 : 1;
	} finally {
		if (db) await options.closeContext?.(db);
	}
}
