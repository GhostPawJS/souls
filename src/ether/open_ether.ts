import { DatabaseSync } from 'node:sqlite';
import type { SoulsDb } from '../database.ts';
import { initEtherTables } from './init_ether_tables.ts';

export function openEther(path: string): SoulsDb {
	const db: SoulsDb = new DatabaseSync(path);
	db.exec('PRAGMA busy_timeout=5000');
	if (path !== ':memory:' && path !== '') {
		db.exec('PRAGMA journal_mode=WAL');
	}
	initEtherTables(db);
	return db;
}
