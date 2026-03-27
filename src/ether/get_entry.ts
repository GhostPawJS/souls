import type { SoulsDb } from '../database.ts';
import type { EtherEntry, EtherEntryRow } from './types.ts';

export function getEntry(db: SoulsDb, entryId: number): EtherEntry | undefined {
	const row = db.prepare(`SELECT * FROM ether_entries WHERE id = ?`).get<EtherEntryRow>(entryId);
	return row ? mapEntryRow(row) : undefined;
}

export function mapEntryRow(row: EtherEntryRow): EtherEntry {
	let metadata: Record<string, unknown> | null = null;
	if (row.metadata) {
		try {
			metadata = JSON.parse(row.metadata) as Record<string, unknown>;
		} catch {
			metadata = null;
		}
	}
	return {
		id: row.id,
		sourceId: row.source_id,
		externalId: row.external_id,
		name: row.name,
		description: row.description,
		content: row.content,
		category: row.category,
		tags: row.tags ? row.tags.split(',').map((t) => t.trim()) : [],
		metadata,
		fetchedAt: row.fetched_at,
	};
}
