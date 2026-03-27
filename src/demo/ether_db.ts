import type { SoulsDb } from '../database.ts';
import { BrowserSoulsDb } from './browser_db.ts';
// @ts-expect-error -- JSON import resolved by esbuild bundler
import etherDump from './ether_dump.json';
import { loadSqlJs } from './load_sqljs.ts';

interface DumpEntry {
	name: string;
	description: string;
	content: string;
	source: string;
	category: string | null;
	tags: string | null;
}

let cached: SoulsDb | null = null;

export async function getEtherDb(): Promise<SoulsDb> {
	if (cached) return cached;

	const SQL = await loadSqlJs();
	const raw = new SQL.Database();
	const db = new BrowserSoulsDb(raw);

	db.exec(`
		CREATE TABLE IF NOT EXISTS ether_sources (
			id              TEXT PRIMARY KEY,
			kind            TEXT NOT NULL,
			url             TEXT NOT NULL,
			label           TEXT NOT NULL,
			etag            TEXT,
			last_fetched_at INTEGER,
			entry_count     INTEGER DEFAULT 0
		)
	`);

	db.exec(`
		CREATE TABLE IF NOT EXISTS ether_entries (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			source_id   TEXT NOT NULL REFERENCES ether_sources(id),
			external_id TEXT NOT NULL,
			name        TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			content     TEXT NOT NULL,
			category    TEXT,
			tags        TEXT,
			metadata    TEXT,
			fetched_at  INTEGER NOT NULL,
			UNIQUE(source_id, external_id)
		)
	`);

	db.exec(`CREATE INDEX IF NOT EXISTS idx_ether_entries_source ON ether_entries(source_id)`);

	db.exec(`
		CREATE VIRTUAL TABLE IF NOT EXISTS ether_fts USING fts5(
			name, description, content, tags,
			content='ether_entries', content_rowid='id'
		)
	`);

	db.exec(
		`INSERT INTO ether_sources (id, kind, url, label) VALUES ('awesome-chatgpt-prompts', 'github-csv', 'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv', 'Awesome ChatGPT Prompts')`,
	);
	db.exec(
		`INSERT INTO ether_sources (id, kind, url, label) VALUES ('rosehill-system-prompts', 'github-json', 'https://raw.githubusercontent.com/danielrosehill/System-Prompt-Library/main/index/index.json', 'System Prompt Library (Rosehill)')`,
	);

	const entries = etherDump as DumpEntry[];
	const stmt = db.prepare(
		`INSERT INTO ether_entries (source_id, external_id, name, description, content, category, tags, metadata, fetched_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	);
	const now = Date.now();
	for (let i = 0; i < entries.length; i++) {
		const e = entries[i];
		stmt.run(
			e.source || 'unknown',
			`${e.source}-${i}`,
			e.name,
			e.description || '',
			e.content,
			e.category,
			e.tags,
			null,
			now,
		);
	}

	db.exec("INSERT INTO ether_fts(ether_fts) VALUES('rebuild')");

	const csvCount = db
		.prepare(`SELECT COUNT(*) AS cnt FROM ether_entries WHERE source_id = ?`)
		.get<{ cnt: number }>('awesome-chatgpt-prompts');
	const jsonCount = db
		.prepare(`SELECT COUNT(*) AS cnt FROM ether_entries WHERE source_id = ?`)
		.get<{ cnt: number }>('rosehill-system-prompts');
	db.prepare(`UPDATE ether_sources SET entry_count = ?, last_fetched_at = ? WHERE id = ?`).run(
		csvCount?.cnt ?? 0,
		now,
		'awesome-chatgpt-prompts',
	);
	db.prepare(`UPDATE ether_sources SET entry_count = ?, last_fetched_at = ? WHERE id = ?`).run(
		jsonCount?.cnt ?? 0,
		now,
		'rosehill-system-prompts',
	);

	cached = db;
	return db;
}
