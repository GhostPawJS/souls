import { DatabaseSync } from 'node:sqlite';
import type { SoulsDb } from '../database.ts';

export async function openTestDatabase(): Promise<SoulsDb> {
	return new DatabaseSync(':memory:');
}
