import type { SqlJsStatic } from 'sql.js-fts5';
import initSqlJs from 'sql.js-fts5';
import sqlWasmUrl from 'sql.js-fts5/dist/sql-wasm.wasm';

let cached: Promise<SqlJsStatic> | null = null;

export function loadSqlJs(): Promise<SqlJsStatic> {
	if (cached === null) {
		cached = initSqlJs({
			locateFile(fileName: string) {
				if (fileName.endsWith('.wasm')) return sqlWasmUrl;
				return fileName;
			},
		});
	}
	return cached;
}
