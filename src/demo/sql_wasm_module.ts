declare module 'sql.js-fts5/dist/sql-wasm.wasm' {
	const url: string;
	export default url;
}

declare module 'sql.js-fts5' {
	interface SqlJsStatic {
		Database: new (data?: ArrayLike<number>) => SqlJsDatabase;
	}

	interface SqlJsDatabase {
		run(sql: string, params?: unknown[]): SqlJsDatabase;
		exec(sql: string): { columns: string[]; values: unknown[][] }[];
		prepare(sql: string): SqlJsPrepared;
		close(): void;
		getRowsModified(): number;
	}

	interface SqlJsPrepared {
		bind(params?: unknown[]): boolean;
		step(): boolean;
		getAsObject(): Record<string, unknown>;
		free(): void;
		run(params?: unknown[]): void;
	}

	function initSqlJs(config?: Record<string, unknown>): Promise<SqlJsStatic>;
	export default initSqlJs;
	export type { SqlJsStatic, SqlJsDatabase, SqlJsPrepared };
}
