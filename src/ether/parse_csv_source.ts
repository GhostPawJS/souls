import { EtherParseError } from './errors.ts';
import type { RawEtherEntry } from './types.ts';

/**
 * RFC 4180-compatible CSV parser that handles quoted fields with embedded
 * newlines and escaped double-quotes. Returns an array of records keyed
 * by the header row column names.
 */
function parseCsv(text: string): Record<string, string>[] {
	const records: Record<string, string>[] = [];
	let headers: string[] | null = null;
	let pos = 0;

	while (pos < text.length) {
		const { fields, next } = parseRow(text, pos);
		pos = next;
		if (fields.length === 0 || (fields.length === 1 && fields[0] === '')) continue;
		if (!headers) {
			headers = fields.map((h) => h.trim());
			continue;
		}
		const record: Record<string, string> = {};
		for (let i = 0; i < headers.length; i++) {
			const key = headers[i] as string;
			record[key] = i < fields.length ? (fields[i] as string) : '';
		}
		records.push(record);
	}

	return records;
}

function parseRow(text: string, start: number): { fields: string[]; next: number } {
	const fields: string[] = [];
	let pos = start;

	while (pos < text.length) {
		if (text[pos] === '"') {
			const { value, next } = parseQuotedField(text, pos);
			fields.push(value);
			pos = next;
		} else {
			let end = pos;
			while (end < text.length && text[end] !== ',' && text[end] !== '\n' && text[end] !== '\r') {
				end++;
			}
			fields.push(text.slice(pos, end));
			pos = end;
		}

		if (pos >= text.length || text[pos] === '\n' || text[pos] === '\r') {
			if (text[pos] === '\r') pos++;
			if (pos < text.length && text[pos] === '\n') pos++;
			break;
		}
		if (text[pos] === ',') pos++;
	}

	return { fields, next: pos };
}

function parseQuotedField(text: string, start: number): { value: string; next: number } {
	let pos = start + 1;
	let value = '';
	while (pos < text.length) {
		if (text[pos] === '"') {
			if (pos + 1 < text.length && text[pos + 1] === '"') {
				value += '"';
				pos += 2;
			} else {
				pos++;
				break;
			}
		} else {
			value += text[pos];
			pos++;
		}
	}
	return { value, next: pos };
}

export function parseCsvSource(text: string): RawEtherEntry[] {
	const records = parseCsv(text);

	if (records.length === 0) {
		throw new EtherParseError('CSV source contains no data rows.');
	}

	const first = records[0] as Record<string, string>;
	if (!('act' in first) || !('prompt' in first)) {
		throw new EtherParseError('CSV missing required "act" and "prompt" columns.');
	}

	const entries: RawEtherEntry[] = [];
	for (const row of records) {
		const name = (row.act ?? '').trim();
		const content = (row.prompt ?? '').trim();
		if (!name || !content) continue;

		entries.push({
			externalId: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
			name,
			description: '',
			content,
			category: (row.type ?? '').trim() || undefined,
			tags: undefined,
			metadata: row.contributor
				? JSON.stringify({ contributor: row.contributor.trim() })
				: undefined,
		});
	}

	return entries;
}
