import type { SoulsDb } from '../database.ts';

/** DDL scaffolding shared by the domain schemas; column SQL stays with its owner. */
export function createTable(db: SoulsDb, name: string, columns: string): void {
	db.exec(`CREATE TABLE IF NOT EXISTS ${name} (${columns}) STRICT`);
}
export function createIndex(db: SoulsDb, name: string, target: string, unique = false): void {
	db.exec(`CREATE ${unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ${name} ON ${target}`);
}

/** Add missing migration columns without repeating table introspection at every call site. */
export function addColumns(db: SoulsDb, table: string, columns: Record<string, string>): void {
	const existing = db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
	for (const [name, type] of Object.entries(columns))
		if (!existing.some((column) => column.name === name))
			db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
}
