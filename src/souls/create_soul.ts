import type { SoulsDb } from '../database.ts';
import { resolveNow } from '../resolve_now.ts';
import { getSoulOrThrow } from './get_soul_or_throw.ts';
import type { CreateSoulInput, SoulRecord } from './types.ts';
import {
	assertSlug,
	assertSoulDescription,
	assertSoulEssence,
	assertSoulName,
} from './validators.ts';

export function createSoul(db: SoulsDb, input: CreateSoulInput): SoulRecord {
	assertSoulName(input.name);
	assertSoulEssence(input.essence);
	assertSoulDescription(input.description);
	if (input.slug != null) assertSlug(input.slug);

	const now = resolveNow(input.now);

	const result = db
		.prepare(
			`INSERT INTO souls (name, slug, essence, description, level, created_at, updated_at)
			 VALUES (?, ?, ?, ?, 1, ?, ?)`,
		)
		.run(input.name, input.slug ?? null, input.essence, input.description, now, now);

	return getSoulOrThrow(db, Number(result.lastInsertRowid));
}
