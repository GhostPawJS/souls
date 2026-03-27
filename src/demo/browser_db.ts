import type { SqlJsDatabase, SqlJsPrepared } from 'sql.js-fts5';
import type { SoulsDb, SoulsRunResult, SoulsStatement } from '../database.ts';

class BrowserStatement implements SoulsStatement {
	constructor(
		private db: SqlJsDatabase,
		private sql: string,
	) {}

	run(...params: unknown[]): SoulsRunResult {
		this.db.run(this.sql, params);
		const rows = this.db.exec('SELECT last_insert_rowid() AS id');
		const lastInsertRowid = rows.length > 0 ? (rows[0].values[0][0] as number) : 0;
		return { lastInsertRowid, changes: this.db.getRowsModified() };
	}

	get<TRecord = Record<string, unknown>>(...params: unknown[]): TRecord | undefined {
		const stmt: SqlJsPrepared = this.db.prepare(this.sql);
		try {
			stmt.bind(params);
			if (!stmt.step()) return undefined;
			return stmt.getAsObject() as TRecord;
		} finally {
			stmt.free();
		}
	}

	all<TRecord = Record<string, unknown>>(...params: unknown[]): TRecord[] {
		const stmt: SqlJsPrepared = this.db.prepare(this.sql);
		const results: TRecord[] = [];
		try {
			stmt.bind(params);
			while (stmt.step()) {
				results.push(stmt.getAsObject() as TRecord);
			}
		} finally {
			stmt.free();
		}
		return results;
	}
}

export class BrowserSoulsDb implements SoulsDb {
	constructor(private db: SqlJsDatabase) {}

	exec(sql: string): void {
		const patched = sql.replace(/\)\s*STRICT\b/gi, ')');
		this.db.exec(patched);
	}

	prepare(sql: string): SoulsStatement {
		return new BrowserStatement(this.db, sql);
	}

	close(): void {
		this.db.close();
	}
}
