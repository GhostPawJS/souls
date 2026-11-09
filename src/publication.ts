import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { SoulsDb } from './database.ts';
import { SoulsConflictError, SoulsValidationError } from './errors.ts';
import { getSoulOrThrow } from './souls/get_soul_or_throw.ts';
import { CliUsageError } from './surfaces/cli_args.ts';

export const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex');
export function initPublicationTables(db: SoulsDb): void {
	db.exec(
		`CREATE TABLE IF NOT EXISTS soul_publications (id INTEGER PRIMARY KEY, soul_id INTEGER NOT NULL REFERENCES souls(id), path TEXT NOT NULL, marker TEXT NOT NULL, file_hash TEXT NOT NULL, block_hash TEXT NOT NULL, created_at INTEGER NOT NULL) STRICT`,
	);
	db.exec(
		`CREATE TABLE IF NOT EXISTS soul_reviews (id INTEGER PRIMARY KEY, soul_id INTEGER NOT NULL REFERENCES souls(id), reason TEXT, created_at INTEGER NOT NULL) STRICT`,
	);
}
export function markerParts(
	text: string,
	marker = 'souls',
): { before: string; block: string; after: string } {
	if (!/^[a-zA-Z0-9_-]+$/.test(marker)) throw new SoulsValidationError('Invalid marker name.');
	const begin = `<!-- ${marker}:begin -->`,
		end = `<!-- ${marker}:end -->`;
	const a = text.indexOf(begin),
		b = text.indexOf(end);
	if (a < 0 && b < 0)
		return {
			before: `${text}${text && !text.endsWith('\n') ? '\n' : ''}${begin}`,
			block: '',
			after: `${end}\n`,
		};
	if (
		a < 0 ||
		b < a ||
		text.indexOf(begin, a + begin.length) >= 0 ||
		text.indexOf(end, b + end.length) >= 0
	)
		throw new SoulsValidationError('Expected one ordered marker pair.');
	const start = a + begin.length;
	return { before: text.slice(0, start), block: text.slice(start, b), after: text.slice(b) };
}
export interface RenderPublicationOptions {
	order?: 'citations' | 'density' | undefined;
	now?: number | undefined;
	includeProvenance?: boolean | undefined;
	budget?: number | undefined;
	into?: string | undefined;
	marker?: string | undefined;
	expectHash?: string | undefined;
}
export function renderPublication(
	db: SoulsDb,
	soulId: number,
	options: RenderPublicationOptions = {},
) {
	const soul = getSoulOrThrow(db, soulId);
	let current = '',
		exists = false;
	if (options.into) {
		try {
			current = readFileSync(options.into, 'utf8');
			exists = true;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
				throw new CliUsageError(`Cannot read file for --against: ${options.into}`);
		}
		if (
			options.expectHash !== undefined &&
			options.expectHash !== (exists ? sha256(current) : 'none')
		)
			throw new SoulsConflictError('File hash conflict.');
	}
	const parts = options.into
		? markerParts(current, options.marker)
		: { before: '', block: '', after: '' };
	const traits = db
		.prepare(
			`SELECT t.id,t.principle,t.provenance,COUNT(DISTINCT c.shard_id) AS citations FROM soul_traits t LEFT JOIN shard_citations c ON c.trait_id=t.id WHERE t.soul_id=? AND t.status='active' GROUP BY t.id ORDER BY ${options?.order === 'density' ? 'citations * 1.0 / MAX(1, (? - t.created_at) / 86400000.0)' : 'citations'} DESC,t.created_at ASC`,
		)
		.all<{ id: number; principle: string; provenance: string }>(
			soulId,
			...(options?.order === 'density' ? [options?.now ?? Date.now()] : []),
		);
	const trimmed = { traitIds: [] as number[], essenceChars: 0 };
	let essence = soul.essence;
	let header = `# ${soul.name}\n*${soul.description}*\n\n`;
	const compose = () =>
		header +
		essence +
		(traits.length
			? `\n\n## Traits\n${traits.map((t) => (options.includeProvenance ? `- **${t.principle}** — ${t.provenance}` : `- ${t.principle}`)).join('\n')}`
			: '');
	const available =
		options.budget === undefined
			? Infinity
			: options.budget - parts.before.length - parts.after.length;
	if (options.budget !== undefined && (!Number.isSafeInteger(options.budget) || options.budget < 0))
		throw new SoulsValidationError('Budget must be a non-negative integer.');
	if (available < 0)
		throw new SoulsValidationError('Budget cannot fit text outside the marker block.');
	const contentAvailable = options.into ? Math.max(0, available - 2) : available;
	while (compose().length > contentAvailable && traits.length)
		trimmed.traitIds.push((traits.pop() as { id: number }).id);
	if (compose().length > contentAvailable) {
		const length = Math.max(0, contentAvailable - header.length);
		trimmed.essenceChars = essence.length - length;
		essence = essence.slice(0, length);
		if (header.length > contentAvailable) header = '';
	}
	const block = compose(),
		text = parts.before + (options.into && available >= 2 ? `\n${block}\n` : block) + parts.after;
	return { text, block, trimmed, current, exists };
}
export function publishSoul(
	db: SoulsDb,
	soulId: number,
	options: RenderPublicationOptions & { into: string },
) {
	const rendered = renderPublication(db, soulId, options);
	const target = resolve(options.into),
		temp = join(dirname(target), `.souls-${randomUUID()}.tmp`);
	try {
		try {
			statSync(dirname(target));
		} catch {
			throw new CliUsageError(`Cannot read file for --against: ${options.into}`);
		}
		writeFileSync(temp, rendered.text, {
			flag: 'wx',
			mode: rendered.exists ? statSync(target).mode : 0o666,
		});
		// Recheck immediately before replacement to detect changes during composition.
		if (options.expectHash !== undefined) {
			let hash = 'none';
			try {
				hash = sha256(readFileSync(target, 'utf8'));
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
			}
			if (hash !== options.expectHash) throw new SoulsConflictError('File hash conflict.');
		}
		renameSync(temp, target);
	} finally {
		try {
			unlinkSync(temp);
		} catch (error) {
			// Best effort cleanup; preserve the original publication error.
			void error;
		}
	}
	const fileHash = sha256(rendered.text),
		blockHash = sha256(rendered.block);
	db.prepare(
		'INSERT INTO soul_publications (soul_id,path,marker,file_hash,block_hash,created_at) VALUES (?,?,?,?,?,?)',
	).run(soulId, target, options.marker ?? 'souls', fileHash, blockHash, Date.now());
	return { ...rendered, fileHash, blockHash };
}
export function diffSoul(
	db: SoulsDb,
	soulId: number,
	file: string,
	marker = 'souls',
	content?: string,
) {
	let text: string;
	try {
		text = content ?? readFileSync(file === '-' ? 0 : file, 'utf8');
	} catch {
		throw new CliUsageError(`Cannot read file for --against: ${file}`);
	}
	const parts = markerParts(text, marker);
	const hasMarkers = text.includes(`<!-- ${marker}:begin -->`);
	const old = hasMarkers ? parts.block.replace(/^\n|\n$/g, '') : text.replace(/\n$/, '');
	const current = renderPublication(db, soulId).block;
	const a = old ? old.split('\n') : [],
		b = current ? current.split('\n') : [];
	const lengths = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
	for (let i = a.length - 1; i >= 0; i--)
		for (let j = b.length - 1; j >= 0; j--)
			(lengths[i] as Uint32Array)[j] =
				a[i] === b[j]
					? (lengths[i + 1]?.[j + 1] ?? 0) + 1
					: Math.max(lengths[i + 1]?.[j] ?? 0, lengths[i]?.[j + 1] ?? 0);
	const added: string[] = [],
		removed: string[] = [],
		lines: string[] = [];
	let i = 0,
		j = 0;
	while (i < a.length || j < b.length) {
		if (i < a.length && j < b.length && a[i] === b[j]) {
			i++;
			j++;
		} else if (
			j < b.length &&
			(i === a.length || (lengths[i]?.[j + 1] ?? 0) >= (lengths[i + 1]?.[j] ?? 0))
		) {
			added.push(b[j] as string);
			lines.push(`+${b[j++]}`);
		} else {
			removed.push(a[i] as string);
			lines.push(`-${a[i++]}`);
		}
	}
	return { same: old === current, markerFound: hasMarkers, added, removed, lines };
}
