import type { SoulsDb } from '../database.ts';
import { ALL_KNOWN_SOURCES } from './known_sources.ts';
import { registerSource } from './register_source.ts';

export function registerDefaults(db: SoulsDb): void {
	for (const source of ALL_KNOWN_SOURCES) {
		registerSource(db, source);
	}
}
