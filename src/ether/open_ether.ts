import { DatabaseSync } from 'node:sqlite';
import type { SoulsDb } from '../database.ts';
import { initEtherTables } from './init_ether_tables.ts';

export function openEther(path: string): SoulsDb {
	const db: SoulsDb = new DatabaseSync(path);
	initEtherTables(db);
	return db;
}
