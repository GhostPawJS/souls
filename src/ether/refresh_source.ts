import type { SoulsDb } from '../database.ts';
import { EtherNotFoundError } from './errors.ts';
import { fetchText } from './fetch_text.ts';
import { getSource } from './list_sources.ts';
import { parseCsvSource } from './parse_csv_source.ts';
import { parseJsonSource } from './parse_json_source.ts';
import type { EtherRefreshResult, RawEtherEntry, RefreshOptions } from './types.ts';

export async function refreshSource(
	db: SoulsDb,
	sourceId: string,
	options?: RefreshOptions,
): Promise<EtherRefreshResult> {
	const start = Date.now();
	const source = getSource(db, sourceId);
	if (!source) throw new EtherNotFoundError(`Source "${sourceId}" not found.`);

	const fetchOpts: { etag?: string | null; timeoutMs?: number } = { etag: source.etag };
	if (options?.timeoutMs !== undefined) fetchOpts.timeoutMs = options.timeoutMs;
	const result = await fetchText(source.url, fetchOpts);

	if (result.status === 304) {
		db.prepare(`UPDATE ether_sources SET last_fetched_at = ? WHERE id = ?`).run(
			Date.now(),
			sourceId,
		);
		return {
			sourceId,
			entriesWritten: source.entryCount,
			skipped: true,
			durationMs: Date.now() - start,
		};
	}

	const entries = parseSourceBody(source.kind, result.body);
	const now = Date.now();

	db.exec('BEGIN TRANSACTION');
	try {
		db.prepare(`DELETE FROM ether_entries WHERE source_id = ?`).run(sourceId);

		const stmt = db.prepare(
			`INSERT INTO ether_entries (source_id, external_id, name, description, content, category, tags, metadata, fetched_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		);
		for (const e of entries) {
			stmt.run(
				sourceId,
				e.externalId,
				e.name,
				e.description,
				e.content,
				e.category ?? null,
				e.tags ?? null,
				e.metadata ?? null,
				now,
			);
		}

		db.exec("INSERT INTO ether_fts(ether_fts) VALUES('rebuild')");

		db.prepare(
			`UPDATE ether_sources SET etag = ?, last_fetched_at = ?, entry_count = ? WHERE id = ?`,
		).run(result.etag ?? null, now, entries.length, sourceId);

		db.exec('COMMIT');
	} catch (err) {
		db.exec('ROLLBACK');
		throw err;
	}

	return {
		sourceId,
		entriesWritten: entries.length,
		skipped: false,
		durationMs: Date.now() - start,
	};
}

function parseSourceBody(kind: string, body: string): RawEtherEntry[] {
	switch (kind) {
		case 'github-csv':
			return parseCsvSource(body);
		case 'github-json':
			return parseJsonSource(body);
		default:
			throw new EtherNotFoundError(`Unknown source kind: ${kind}`);
	}
}
