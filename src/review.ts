import type { SoulsDb } from './database.ts';
import { getSoulOrThrow } from './souls/get_soul_or_throw.ts';
import { stampAttuned } from './souls/stamp_attuned.ts';
import { withTransaction } from './with_transaction.ts';
export function reviewNoChange(
	db: SoulsDb,
	soulId: number,
	options: { reason?: string | undefined; now?: number | undefined } = {},
) {
	return withTransaction(db, () => {
		getSoulOrThrow(db, soulId);
		const now = options.now ?? Date.now();
		const result = db
			.prepare('INSERT INTO soul_reviews (soul_id,reason,created_at) VALUES (?,?,?)')
			.run(soulId, options.reason ?? null, now);
		stampAttuned(db, soulId, { now });
		return {
			id: Number(result.lastInsertRowid),
			soulId,
			reason: options.reason ?? null,
			createdAt: now,
		};
	});
}
