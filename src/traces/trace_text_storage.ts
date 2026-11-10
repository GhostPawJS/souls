import { createHash } from 'node:crypto';
import type { SoulsDb } from '../database.ts';
import type { Trace } from './types.ts';

export function encodeSnapshot(db: SoulsDb, raw: string): string {
	const value = JSON.parse(raw) as Trace;
	if (typeof value.text !== 'string' || value.text.length < 256) return raw;
	const hash = createHash('sha256').update(value.text).digest('hex');
	db.prepare('INSERT OR IGNORE INTO soul_trace_texts VALUES (?,?)').run(hash, value.text);
	return JSON.stringify({ ...value, text: { traceTextHash: hash } });
}
export function decodeSnapshot(db: SoulsDb, raw: string): Trace {
	const value = JSON.parse(raw);
	if (value.text && typeof value.text === 'object' && value.text.traceTextHash) {
		const row = db
			.prepare('SELECT text FROM soul_trace_texts WHERE hash=?')
			.get<{ text: string }>(value.text.traceTextHash);
		if (!row) throw new Error('Missing trace snapshot text');
		value.text = row.text;
	}
	return value as Trace;
}
