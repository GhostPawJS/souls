import type { SoulsDb } from '../database.ts';
import { SoulsStateError } from '../errors.ts';
import { resolveNow } from '../resolve_now.ts';
import { getSoulOrThrow } from '../souls/get_soul_or_throw.ts';
import { withTransaction } from '../with_transaction.ts';
import { getLevelHistory } from './get_level_history.ts';

export function revertLevelUp(db: SoulsDb, soulId: number, options?: { now?: number }): void {
	const soul = getSoulOrThrow(db, soulId);
	if (soul.level < 2) {
		throw new SoulsStateError(`Soul ${soulId} is at level 1 — nothing to revert.`);
	}

	const history = getLevelHistory(db, soulId);
	const lastSnapshot = history[history.length - 1];
	if (!lastSnapshot) {
		throw new SoulsStateError(`No level-up history found for soul ${soulId}.`);
	}

	const now = resolveNow(options?.now);

	withTransaction(db, () => {
		// 1. Reactivate consolidated traits first (clears merged_into FK reference)
		for (const traitId of lastSnapshot.traitsConsolidated) {
			db.prepare(
				`UPDATE soul_traits SET status = 'active', merged_into = NULL, updated_at = ? WHERE id = ?`,
			).run(now, traitId);
		}

		// 2. Delete the merged traits created during the level-up (now safe: no more FK refs)
		for (const mergedId of lastSnapshot.traitsMerged) {
			// Remove citations pointing to merged traits first
			db.prepare(`DELETE FROM shard_citations WHERE trait_id = ?`).run(mergedId);
			db.prepare(`DELETE FROM soul_traits WHERE id = ?`).run(mergedId);
		}

		// 3. Reactivate promoted traits
		for (const traitId of lastSnapshot.traitsPromoted) {
			db.prepare(`UPDATE soul_traits SET status = 'active', updated_at = ? WHERE id = ?`).run(
				now,
				traitId,
			);
		}

		// 4. Restore previous generation on carried traits
		const previousLevel = soul.level - 1;
		for (const traitId of lastSnapshot.traitsCarried) {
			db.prepare(`UPDATE soul_traits SET generation = ?, updated_at = ? WHERE id = ?`).run(
				previousLevel,
				now,
				traitId,
			);
		}

		// 5. Restore essence and decrement level
		db.prepare(`UPDATE souls SET essence = ?, level = level - 1, updated_at = ? WHERE id = ?`).run(
			lastSnapshot.essenceBefore,
			now,
			soulId,
		);

		// 6. Remove the snapshot
		db.prepare(`DELETE FROM soul_levels WHERE id = ?`).run(lastSnapshot.id);

		// 7. Re-unfade shards that drop below the fade threshold after citation deletion
		// A shard is faded if cited by >= shardFadeCitations distinct traits.
		// After deletion, some may drop below. Reset them to pending.
		db.prepare(
			`UPDATE soul_shards SET status = 'pending', updated_at = ?
			 WHERE status = 'faded'
			   AND id NOT IN (
			     SELECT DISTINCT shard_id FROM shard_citations
			   )`,
		).run(now);
	});
}
