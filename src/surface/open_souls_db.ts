import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import type { SoulsDb } from '../database.ts';
import { initSoulsTables } from '../init_souls_tables.ts';
import { CliUsageError } from '../surfaces/cli_args.ts';

export async function openSoulsDb(path: string): Promise<SoulsDb> {
	const started = performance.now();
	if (path.startsWith('file:')) path = fileURLToPath(new URL(path));
	const timeout = Number(process.env.GHOSTPAW_SOULS_BUSY_TIMEOUT ?? 5000);
	if (!Number.isSafeInteger(timeout) || timeout < 0)
		throw new CliUsageError('busy-timeout must be a non-negative integer in milliseconds');
	const timings = process.env.GHOSTPAW_SOULS_TIMINGS === '1';
	const original = process.emitWarning;
	process.emitWarning = ((warning, ...args: unknown[]) => {
		const type =
			typeof args[0] === 'string'
				? args[0]
				: typeof args[0] === 'object' && args[0] !== null && 'type' in args[0]
					? args[0].type
					: warning instanceof Error
						? warning.name
						: undefined;
		const message = warning instanceof Error ? warning.message : warning;
		if (type === 'ExperimentalWarning' && message.startsWith('SQLite is an experimental feature'))
			return;
		Reflect.apply(original, process, [warning, ...args]);
	}) as typeof process.emitWarning;
	let sqlite: typeof import('node:sqlite');
	try {
		sqlite = await import('node:sqlite');
	} finally {
		process.emitWarning = original;
	}
	if (path !== ':memory:') {
		const directory = dirname(path);
		try {
			mkdirSync(directory, { recursive: true });
		} catch (error) {
			const code = (error as NodeJS.ErrnoException).code;
			const reason =
				code === 'ENOTDIR' || code === 'EEXIST'
					? 'a path component is not a directory'
					: code === 'EACCES' || code === 'EPERM'
						? 'permission denied'
						: code === 'EROFS'
							? 'read-only file system'
							: code;
			throw new CliUsageError(`Cannot create database directory ${directory}: ${reason}`);
		}
	}
	const raw = new sqlite.DatabaseSync(path);
	raw.exec(`PRAGMA busy_timeout=${timeout}`);
	const retry = <T>(operation: () => T): T => {
		const start = performance.now();
		let noticed = false;
		for (;;) {
			try {
				raw.exec('PRAGMA busy_timeout=0');
				return operation();
			} catch (error) {
				if (
					!/database (?:is )?(?:locked|busy)/i.test(String(error)) ||
					performance.now() - start >= timeout
				)
					throw error;
				if (!noticed) {
					process.stderr.write(`Waiting for SQLite lock (timeout ${timeout}ms).\n`);
					noticed = true;
				}
				Atomics.wait(
					new Int32Array(new SharedArrayBuffer(4)),
					0,
					0,
					Math.min(25, Math.max(1, timeout - (performance.now() - start))),
				);
			} finally {
				raw.exec(`PRAGMA busy_timeout=${timeout}`);
			}
		}
	};
	const db: SoulsDb = {
		exec: (sql) => retry(() => raw.exec(sql)),
		prepare: (sql) => {
			const pragma = /^\s*PRAGMA\s+busy_timeout\s*;?$/i.test(sql);
			const stmt = pragma ? raw.prepare(sql) : retry(() => raw.prepare(sql));
			return {
				run: (...params: unknown[]) => retry(() => Reflect.apply(stmt.run, stmt, params)),
				get: <T>(...params: unknown[]) =>
					(pragma
						? Reflect.apply(stmt.get, stmt, params)
						: retry(() => Reflect.apply(stmt.get, stmt, params))) as T | undefined,
				all: <T>(...params: unknown[]) => retry(() => Reflect.apply(stmt.all, stmt, params)) as T[],
			};
		},
		close: () => {
			raw.close();
			if (timings)
				process.stderr.write(`timings total=${(performance.now() - started).toFixed(1)}ms\n`);
		},
	};
	try {
		if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='souls'").get())
			db.exec('PRAGMA journal_mode=WAL');
		if (timings)
			process.stderr.write(`timings open=${(performance.now() - started).toFixed(1)}ms\n`);
		const context = db as unknown as SoulsDb;
		const initStart = performance.now();
		initSoulsTables(context);
		if (timings)
			process.stderr.write(`timings init=${(performance.now() - initStart).toFixed(1)}ms\n`);
		return context;
	} catch (error) {
		db.close();
		throw error;
	}
}
