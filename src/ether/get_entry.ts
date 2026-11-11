import type { SoulsDb } from '../database.ts';
import { projectRow } from '../lib/project_row.ts';
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
		...projectRow<Omit<EtherEntry, 'tags' | 'metadata' | 'fetchedAt'>>(row, [
			'id',
			'source_id',
			'external_id',
			'name',
			'description',
			'content',
			'category',
		]),
		tags: row.tags ? row.tags.split(',').map((t) => t.trim()) : [],
		metadata,
		fetchedAt: row.fetched_at,
	};
}
