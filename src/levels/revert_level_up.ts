import type { SoulsDb } from '../database.ts';
import { SoulsStateError } from '../errors.ts';
import { resolveNow } from '../resolve_now.ts';
import { recordRevision } from '../revisions.ts';
import { getSoulOrThrow } from '../souls/get_soul_or_throw.ts';
import type { TraitRow } from '../traits/types.ts';
import { withTransaction } from '../with_transaction.ts';
import { getLevelHistory } from './get_level_history.ts';

export function revertLevelUp(
	db: SoulsDb,
	soulId: number,
	options?: { now?: number; onWarning?: (warning: string) => void },
): void {
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

		// 2. Retain merged traits and citations as historical evidence.
		for (const mergedId of lastSnapshot.traitsMerged) {
			db.prepare(`UPDATE soul_traits SET status = 'reverted', updated_at = ? WHERE id = ?`).run(
				now,
				mergedId,
			);
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

		recordRevision(db, 'essence', soulId, soulId, soul.essence, lastSnapshot.essenceBefore, {
			now,
			reason: 'revert level up',
		});
		const stored = db
			.prepare('SELECT state_before, faded_shard_ids FROM soul_levels WHERE id = ?')
			.get<{ state_before: string | null; faded_shard_ids: string | null }>(lastSnapshot.id);
		if (stored?.state_before) {
			for (const trait of JSON.parse(stored.state_before) as TraitRow[]) {
				const current = db
					.prepare('SELECT principle FROM soul_traits WHERE id = ?')
					.get<{ principle: string }>(trait.id);
				if (current && current.principle !== trait.principle)
					recordRevision(db, 'trait', trait.id, soulId, current.principle, trait.principle, {
						now,
						reason: 'revert level up',
					});
				db.prepare(
					'UPDATE soul_traits SET principle=?, provenance=?, generation=?, status=?, merged_into=?, created_at=?, updated_at=? WHERE id=?',
				).run(
					trait.principle,
					trait.provenance,
					trait.generation,
					trait.status,
					trait.merged_into,
					trait.created_at,
					trait.updated_at,
					trait.id,
				);
			}
		}
		if (stored?.faded_shard_ids !== null && stored?.faded_shard_ids !== undefined) {
			for (const id of JSON.parse(stored.faded_shard_ids) as number[])
				db.prepare("UPDATE soul_shards SET status='pending', updated_at=? WHERE id=?").run(now, id);
		} else {
			options?.onWarning?.(
				'Legacy level snapshot has no faded shard record; restoring uncited faded shards.',
			);
			db.prepare(
				`UPDATE soul_shards SET status='pending', updated_at=? WHERE status='faded' AND id NOT IN (SELECT shard_id FROM shard_citations)`,
			).run(now);
		}
		db.prepare('DELETE FROM soul_levels WHERE id = ?').run(lastSnapshot.id);
	});
}
