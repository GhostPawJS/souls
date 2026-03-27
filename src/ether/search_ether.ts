import type { SoulsDb } from '../database.ts';
import type { EtherEntryRow, EtherSearchResult, SearchOptions } from './types.ts';

interface SearchRow extends EtherEntryRow {
	rank: number;
}

export function searchEther(
	db: SoulsDb,
	query: string,
	options?: SearchOptions,
): EtherSearchResult[] {
	const trimmed = query.trim();
	if (trimmed.length < 2) return [];

	const conditions: string[] = [];
	const params: (string | number)[] = [trimmed];

	if (options?.sourceId) {
		conditions.push(`e.source_id = ?`);
		params.push(options.sourceId);
	}
	if (options?.category) {
		conditions.push(`e.category = ?`);
		params.push(options.category);
	}

	const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
	const limit = options?.limit ?? 50;

	const sql = `
		SELECT e.*, fts.rank
		FROM ether_fts fts
		JOIN ether_entries e ON e.id = fts.rowid
		WHERE ether_fts MATCH ?
		  ${whereClause}
		ORDER BY fts.rank
		LIMIT ${limit}
	`;

	try {
		return db
			.prepare(sql)
			.all<SearchRow>(...params)
			.map(mapSearchRow);
	} catch {
		return searchFallback(db, trimmed, options);
	}
}

function searchFallback(db: SoulsDb, query: string, options?: SearchOptions): EtherSearchResult[] {
	const conditions: string[] = [`(e.name LIKE ? OR e.description LIKE ? OR e.content LIKE ?)`];
	const like = `%${query}%`;
	const params: (string | number)[] = [like, like, like];

	if (options?.sourceId) {
		conditions.push(`e.source_id = ?`);
		params.push(options.sourceId);
	}
	if (options?.category) {
		conditions.push(`e.category = ?`);
		params.push(options.category);
	}

	const limit = options?.limit ?? 50;
	const sql = `
		SELECT e.*, 0 AS rank
		FROM ether_entries e
		WHERE ${conditions.join(' AND ')}
		ORDER BY e.name ASC
		LIMIT ${limit}
	`;

	return db
		.prepare(sql)
		.all<SearchRow>(...params)
		.map(mapSearchRow);
}

function mapSearchRow(row: SearchRow): EtherSearchResult {
	return {
		id: row.id,
		sourceId: row.source_id,
		name: row.name,
		description: row.description,
		content: row.content,
		category: row.category,
		tags: row.tags ? row.tags.split(',').map((t) => t.trim()) : [],
		rank: row.rank,
	};
}
