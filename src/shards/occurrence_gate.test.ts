import { equal } from 'node:assert/strict';
import { test } from 'node:test';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { createSoul } from '../souls/create_soul.ts';
import { checkCrystallizationForSoul } from './check_crystallization_for_soul.ts';
import { dropShard } from './drop_shard.ts';

const day = 86_400_000;
test('occurrence age spread requires distant different sources or a live spread, including legacy rows', async () => {
	const cases = [
		{
			name: 'single source backfill over a week',
			sources: ['chat', 'chat', 'chat'],
			times: [day, day * 2, day * 8],
			inserts: [day * 10, day * 10, day * 10],
			ready: false,
		},
		{
			name: 'backfill chat and live email a week apart',
			sources: ['chat', 'chat', 'email'],
			times: [day, day * 2, day * 8],
			inserts: [day * 10, day * 10, day * 8],
			ready: true,
		},
		{
			name: 'two backfill sources too close to span the day',
			sources: ['chat', 'email', 'chat'],
			times: [day, day + 1, day * 8],
			inserts: [day * 10, day * 10, day * 10],
			ready: true,
		},
		{
			name: 'different sources do not span the occurrence spread',
			sources: ['chat', 'email', 'chat'],
			times: [day, day * 1.75, day * 2.5],
			inserts: [day * 10, day * 10, day * 10],
			ready: false,
		},
		{
			name: 'live spread two days two sources',
			sources: ['chat', 'email', 'chat'],
			times: [day, day * 2, day * 3],
			inserts: [day, day * 2, day * 3],
			ready: true,
		},
		{
			name: 'live spread independently spans a day',
			sources: ['chat', 'chat', 'email'],
			times: [day, day * 2.5, day * 1.75],
			inserts: [day, day * 2.5, day * 10],
			ready: true,
		},
		{
			name: 'legacy rows without occurrence timestamps',
			sources: ['chat', 'email', 'chat'],
			times: [day, day * 2, day * 3],
			inserts: [day, day * 2, day * 3],
			ready: true,
			legacy: true,
		},
	];
	for (const entry of cases) {
		const db = await createInitializedSoulsDb();
		try {
			const soul = createSoul(db, { name: 'Test', essence: 'Read', description: 'Test' });
			for (let i = 0; i < 3; i++) {
				const shard = dropShard(
					db,
					{
						content: ['Read user intent', 'Test database rollback', 'Document public interfaces'][
							i
						] as string,
						source: entry.sources[i] as string,
						soulIds: [soul.id],
						occurredAt: entry.times[i] as number,
						now: entry.inserts[i] as number,
					},
					{ readiness: 'legacy' },
				).shard;
				if (entry.legacy)
					db.prepare('UPDATE soul_shards SET occurred_at=NULL, inserted_at=NULL WHERE id=?').run(
						shard.id,
					);
			}
			const result = checkCrystallizationForSoul(db, soul.id, {
				readiness: 'legacy',
				now: day * 10,
			});
			equal(result?.ready, entry.ready, entry.name);
			if (!entry.ready)
				equal(result?.reason, 'Age spread must span at least two sources by occurrence time.');
		} finally {
			db.close();
		}
	}
});
