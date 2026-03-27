import type { SoulsDb } from '../database.ts';
import { EtherError } from './errors.ts';
import type { EtherSourceInput } from './types.ts';

export function registerSource(db: SoulsDb, source: EtherSourceInput): void {
	if (!source.id || !source.id.trim()) {
		throw new EtherError('Source id must be a non-empty string.');
	}
	if (!source.url || !source.url.trim()) {
		throw new EtherError('Source url must be a non-empty string.');
	}
	db.prepare(`INSERT OR IGNORE INTO ether_sources (id, kind, url, label) VALUES (?, ?, ?, ?)`).run(
		source.id,
		source.kind,
		source.url,
		source.label,
	);
}
