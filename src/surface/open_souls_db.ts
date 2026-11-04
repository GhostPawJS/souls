import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SoulsDb } from '../database.ts';
import { initSoulsTables } from '../init_souls_tables.ts';
import { CliUsageError } from '../surfaces/cli_args.ts';

export async function openSoulsDb(path: string): Promise<SoulsDb> {
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
	const db = new sqlite.DatabaseSync(path);
	try {
		db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
		const context = db as unknown as SoulsDb;
		initSoulsTables(context);
		return context;
	} catch (error) {
		db.close();
		throw error;
	}
}
