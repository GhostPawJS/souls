import { readFileSync } from 'node:fs';
import type { ToolCliOptions } from './cli.ts';
import { CliUsageError } from './cli_args.ts';

// Translate JSONL into the tool path, preserving physical line numbers for errors.
export async function traceBatchArgs<T>(
	args: string[],
	options: ToolCliOptions<T>,
): Promise<string[] | undefined> {
	const noun = args.indexOf('trace');
	if (noun < 0 || args[noun + 1] !== 'record' || args.includes('--help') || args.includes('-h'))
		return;
	const index = args.findIndex((a) => a === '--batch' || a.startsWith('--batch='));
	if (index < 0) return;
	const token = args[index] as string;
	const path = token.includes('=') ? token.slice(8) : args[index + 1];
	if (!path || path.startsWith('--')) throw new CliUsageError('--batch requires a JSONL path or -');
	let raw = '';
	if (path === '-') for await (const chunk of options.stdin ?? process.stdin) raw += String(chunk);
	else raw = readFileSync(path, 'utf8');
	const rest = args.filter(
		(_, i) =>
			i !== noun && i !== noun + 1 && i !== index && (token.includes('=') || i !== index + 1),
	);
	const defaults: Record<string, unknown> = {};
	for (let i = 0; i < rest.length; i++) {
		const flag = rest[i] as string;
		if (flag === '--import') {
			defaults.import = true;
			rest.splice(i--, 1);
		} else if (/^--(?:tz|created-at|updated-at)(?:=|$)/.test(flag)) {
			const [name, inline] = flag.slice(2).split(/=(.*)/s);
			const key = (name as string).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
			defaults[key] = inline ?? rest[i + 1];
			rest.splice(i, inline === undefined ? 2 : 1);
			i--;
		}
	}
	const lines: number[] = [];
	const items = raw.split(/\r?\n/).flatMap((line, index) => {
		if (!line.trim()) return [];
		try {
			const value = JSON.parse(line);
			if (!value || typeof value !== 'object' || Array.isArray(value))
				throw new Error('Expected object');
			lines.push(index + 1);
			return [
				{ ...defaults, ...value, action: 'record', ...(defaults.import ? { import: true } : {}) },
			];
		} catch {
			throw new CliUsageError(`Line ${index + 1}: invalid JSON object`);
		}
	});
	return [
		'call',
		'trace_soul',
		JSON.stringify({ action: 'record_batch', items, batchLines: lines }),
		...rest,
	];
}
