import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { resolveNow } from '../resolve_now.ts';
import { getSoulOrThrow } from '../souls/get_soul_or_throw.ts';
import type { CrystallizationCheckOptions } from './check_crystallization_for_soul.ts';
import { checkCrystallizationForSoul } from './check_crystallization_for_soul.ts';
import { getShardOrThrow } from './get_shard_or_throw.ts';
import { normalizeShardContent } from './normalize_shard_content.ts';
import { normalizeTags } from './normalize_tag.ts';
import type { DropShardInput, DropShardResult } from './types.ts';
import { assertShardContent, assertShardSource, assertSoulIds } from './validators.ts';

export function dropShard(
	db: SoulsDb,
	input: DropShardInput,
	options?: CrystallizationCheckOptions & { insertedAt?: number },
): DropShardResult {
	if (input.idempotencyKey !== undefined) {
		const existing = db
			.prepare('SELECT id FROM soul_shards WHERE idempotency_key = ?')
			.get<{ id: number }>(input.idempotencyKey);
		if (existing)
			return {
				shard: getShardOrThrow(db, existing.id),
				crystallizationTriggers: [],
				duplicate: true,
			};
	}
	const occurredAt =
		typeof input.occurredAt === 'string' ? Date.parse(input.occurredAt) : input.occurredAt;
	if (occurredAt !== undefined && !Number.isSafeInteger(occurredAt))
		throw new SoulsValidationError('Invalid occurredAt timestamp.');
	assertShardContent(input.content);
	assertShardSource(input.source);
	assertSoulIds(input.soulIds);

	for (const soulId of input.soulIds) getSoulOrThrow(db, soulId);

	const content = normalizeShardContent(input.content);
	const tags = normalizeTags(input.tags ?? []);
	const now = resolveNow(input.now);
	const sealed = input.sealed ? 1 : 0;

	const result = db
		.prepare(
			`INSERT INTO soul_shards (content, source, status, sealed, created_at, updated_at, occurred_at, idempotency_key, ref, inserted_at)
			 VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
		)
		.run(
			content,
			input.source,
			sealed,
			now,
			now,
			occurredAt ?? null,
			input.idempotencyKey ?? null,
			input.ref ?? null,
			options?.insertedAt ?? now,
		);

	const shardId = Number(result.lastInsertRowid);

	for (const soulId of input.soulIds) {
		db.prepare(`INSERT INTO shard_souls (shard_id, soul_id) VALUES (?, ?)`).run(shardId, soulId);
	}

	for (const tag of tags) {
		db.prepare(`INSERT OR IGNORE INTO shard_tags (shard_id, tag) VALUES (?, ?)`).run(shardId, tag);
	}

	const shard = getShardOrThrow(db, shardId);

	// 2-phase crystallization gate: run per attributed soul
	const crystallizationTriggers: number[] = [];
	for (const soulId of input.soulIds) {
		const check = checkCrystallizationForSoul(db, soulId, {
			...options,
			now: options?.insertedAt ?? now,
		});
		if (check?.ready) crystallizationTriggers.push(soulId);
	}

	return { shard, crystallizationTriggers };
}
