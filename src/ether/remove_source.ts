import type { SoulsDb } from '../database.ts';
import { EtherNotFoundError } from './errors.ts';

export function removeSource(db: SoulsDb, sourceId: string): void {
	const existing = db
		.prepare(`SELECT id FROM ether_sources WHERE id = ?`)
		.get<{ id: string }>(sourceId);
	if (!existing) {
		throw new EtherNotFoundError(`Source "${sourceId}" not found.`);
	}
	db.prepare(`DELETE FROM ether_entries WHERE source_id = ?`).run(sourceId);
	db.prepare(`DELETE FROM ether_sources WHERE id = ?`).run(sourceId);
	try {
		db.exec("INSERT INTO ether_fts(ether_fts) VALUES('rebuild')");
	} catch {}
}
