import type { SoulsDb } from '../database.ts';
import type { EtherSource, EtherSourceKind, EtherSourceRow } from './types.ts';

function mapSourceRow(row: EtherSourceRow): EtherSource {
	return {
		id: row.id,
		kind: row.kind as EtherSourceKind,
		url: row.url,
		label: row.label,
		etag: row.etag,
		lastFetchedAt: row.last_fetched_at,
		entryCount: row.entry_count,
	};
}

export function listSources(db: SoulsDb): EtherSource[] {
	return db
		.prepare(`SELECT * FROM ether_sources ORDER BY id ASC`)
		.all<EtherSourceRow>()
		.map(mapSourceRow);
}

export function getSource(db: SoulsDb, sourceId: string): EtherSource | undefined {
	const row = db.prepare(`SELECT * FROM ether_sources WHERE id = ?`).get<EtherSourceRow>(sourceId);
	return row ? mapSourceRow(row) : undefined;
}
