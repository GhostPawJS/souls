import type { SoulsDb } from '../database.ts';
import { initSoulsTables } from '../init_souls_tables.ts';
import { openTestDatabase } from './open-test-database.ts';

export async function createInitializedSoulsDb(): Promise<SoulsDb> {
	const db = await openTestDatabase();
	initSoulsTables(db);
	return db;
}
