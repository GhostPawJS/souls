import type { SoulsDb } from '../database.ts';
import { resolveNow } from '../resolve_now.ts';
import { getSoulOrThrow } from './get_soul_or_throw.ts';
import type { SoulRecord, UpdateSoulInput } from './types.ts';
import {
	assertSlug,
	assertSoulDescription,
	assertSoulEssence,
	assertSoulName,
} from './validators.ts';

export function updateSoul(db: SoulsDb, id: number, input: UpdateSoulInput): SoulRecord {
	const soul = getSoulOrThrow(db, id);

	if (input.name !== undefined) assertSoulName(input.name);
	if (input.essence !== undefined) assertSoulEssence(input.essence);
	if (input.description !== undefined) assertSoulDescription(input.description);
	if (input.slug != null) assertSlug(input.slug);

	const now = resolveNow(input.now);

	db.prepare(
		`UPDATE souls SET
			name        = COALESCE(?, name),
			slug        = CASE WHEN ? = 1 THEN ? ELSE slug END,
			essence     = COALESCE(?, essence),
			description = COALESCE(?, description),
			updated_at  = ?
		 WHERE id = ?`,
	).run(
		input.name ?? null,
		'slug' in input ? 1 : 0,
		input.slug ?? null,
		input.essence ?? null,
		input.description ?? null,
		now,
		soul.id,
	);

	return getSoulOrThrow(db, id);
}
