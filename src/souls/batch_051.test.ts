import { deepEqual, equal, match, ok, throws } from 'node:assert/strict';
import { test } from 'node:test';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { renderPublication } from '../publication.ts';
import { checkCrystallizationForSoul } from '../shards/check_crystallization_for_soul.ts';
import { citeShard } from '../shards/cite_shard.ts';
import { clusterShards } from '../shards/cluster_shards.ts';
import { computeSuggestedActions } from '../shards/compute_suggested_actions.ts';
import { computeTraitAlignment } from '../shards/compute_trait_alignment.ts';
import { dropShard } from '../shards/drop_shard.ts';
import { listShards } from '../shards/list_shards.ts';
import { renderSoulsSoulPromptFoundation, soulsSoul } from '../soul.ts';
import { inspectSoulsItemToolHandler } from '../tools/inspect_souls_item_tool.ts';
import { levelUpSoulToolHandler } from '../tools/level_up_soul_tool.ts';
import { observeSoulToolHandler } from '../tools/observe_soul_tool.ts';
import { reviewSoulsToolHandler } from '../tools/review_souls_tool.ts';
import { addTrait } from '../traits/add_trait.ts';
import { createSoul } from './create_soul.ts';
import { getSoulProfile } from './get_soul_profile.ts';
import { renderSoul } from './render_soul.ts';
import { resolveSoulReference } from './resolve_soul_reference.ts';
import { updateSoul } from './update_soul.ts';

const DAY = 86_400_000;

test('references prefer id, external ref and slug over name; dormant and missing slugs fail clearly', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const a = createSoul(db, {
			name: 'Named',
			slug: 'mentor',
			externalId: 'external',
			essence: 'E',
			description: 'D',
		});
		createSoul(db, { name: 'mentor', essence: 'Other', description: 'D' });
		for (const ref of [String(a.id), 'ext:external', 'mentor', 'Named'])
			equal(resolveSoulReference(db, ref), a.id);
		const inspected = inspectSoulsItemToolHandler(db, { soulId: 'mentor' });
		ok(inspected.ok);
		equal(inspected.data.profile.soul.id, a.id);
		const batch = observeSoulToolHandler(db, {
			action: 'drop_batch',
			shards: [{ content: 'Evidence', source: 's', soulIds: ['mentor'] }],
		});
		ok(batch.ok);
		throws(
			() => resolveSoulReference(db, 'absent'),
			/tried slug, name.*numeric id, ext: external ref, slug, name/,
		);
		throws(() => resolveSoulReference(db, '999'), /tried numeric id, slug, name/);
		db.prepare('UPDATE souls SET deleted_at=1 WHERE id=?').run(a.id);
		throws(() => resolveSoulReference(db, 'Named'), /Soul not found/);
	} finally {
		db.close();
	}
});

test('render defaults to citation count; density ranks per day and publication trims in chosen order', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const soul = createSoul(db, { name: 'Ranked', essence: 'E', description: 'D', now: DAY });
		const old = addTrait(db, soul.id, {
			principle: 'Older popular trait',
			provenance: 'Old provenance',
			now: DAY,
		});
		const recent = addTrait(db, soul.id, {
			principle: 'Recent dense trait',
			provenance: 'Recent provenance',
			now: 99 * DAY,
		});
		for (let i = 0; i < 3; i++) {
			const shard = dropShard(db, {
				content: `Observation ${i}`,
				source: 's',
				soulIds: [soul.id],
				now: 99 * DAY,
			}).shard;
			citeShard(db, shard.id, old.id);
			if (i === 0) citeShard(db, shard.id, recent.id);
		}
		const normal = renderSoul(db, soul.id, { now: 100 * DAY });
		equal(normal, renderSoul(db, soul.id, { order: 'citations', now: 100 * DAY }));
		ok(normal.indexOf(old.principle) < normal.indexOf(recent.principle));
		const dense = renderSoul(db, soul.id, { order: 'density', now: 100 * DAY });
		ok(dense.indexOf(recent.principle) < dense.indexOf(old.principle));
		equal(renderPublication(db, soul.id, { order: 'density', now: 100 * DAY }).text, dense);
		const limited = renderPublication(db, soul.id, {
			order: 'density',
			now: 100 * DAY,
			budget: dense.length - old.principle.length - 3,
		});
		deepEqual(limited.trimmed.traitIds, [old.id]);
		ok(!normal.includes('Old provenance'));
		match(renderSoul(db, soul.id, { includeProvenance: true }), /Old provenance/);
	} finally {
		db.close();
	}
});

test('foundation provenance remains included by default and can be omitted', () => {
	const full = renderSoulsSoulPromptFoundation();
	equal(full, renderSoulsSoulPromptFoundation(soulsSoul, { includeProvenance: true }));
	const lean = renderSoulsSoulPromptFoundation(soulsSoul, { includeProvenance: false });
	for (const trait of soulsSoul.traits) {
		ok(full.includes(trait.provenance));
		ok(!lean.includes(trait.provenance));
		ok(lean.includes(trait.principle));
	}
});

test('readiness thresholds are configurable; never-attuned priority uses creation and attuned priority uses attunement', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const soul = createSoul(db, { name: 'Ready', essence: 'E', description: 'D', now: 100 * DAY });
		for (const [i, content] of [
			'Ocean waves and saltwater',
			'Database transactions ensure consistency',
			'Garden plants grow roots',
		].entries())
			dropShard(
				db,
				{ content, source: 'one', soulIds: [soul.id], now: (101 + i / 4) * DAY },
				{ readiness: 'legacy' },
			);
		equal(checkCrystallizationForSoul(db, soul.id, { readiness: 'legacy', now: 102 * DAY }), null);
		const opts = {
			readiness: 'legacy' as const,
			now: 102 * DAY,
			minSourceDiversity: 1,
			minSpreadDays: 0.5,
		};
		const check = checkCrystallizationForSoul(db, soul.id, opts);
		ok(check?.ready);
		equal(check.priorityScore, (3 * 1 * 0.5) / 2);
		equal(
			checkCrystallizationForSoul(db, soul.id, {
				...opts,
				minSourceDiversity: 2,
			}),
			null,
		);
		equal(
			checkCrystallizationForSoul(db, soul.id, {
				...opts,
				minSpreadDays: 0.51,
			}),
			null,
		);
		throws(
			() => checkCrystallizationForSoul(db, soul.id, { readiness: 'legacy', minSpreadDays: -1 }),
			/minSpreadDays/,
		);
		const review = reviewSoulsToolHandler(db, { view: 'readiness', ...opts });
		ok(review.ok);
		ok('readySouls' in review.data);
		equal(review.data.readySouls.length, 1);
		db.prepare('UPDATE souls SET last_attuned_at=? WHERE id=?').run(101 * DAY, soul.id);
		equal(checkCrystallizationForSoul(db, soul.id, opts)?.priorityScore, 1.5);
	} finally {
		db.close();
	}
});

test('health exposes its factors at zero evidence, with evidence, at capacity and for stale traits', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const soul = createSoul(db, { name: 'Health', essence: 'E', description: 'D', now: DAY });
		let profile = getSoulProfile(db, soul.id, { now: 2 * DAY });
		deepEqual(
			[profile.freshness, profile.headroom, profile.evidenceRatio, profile.health],
			[1, 1, 0, 0],
		);
		dropShard(db, { content: 'Evidence', source: 's', soulIds: [soul.id], now: DAY });
		addTrait(db, soul.id, { principle: 'A principle', provenance: 'P', now: DAY });
		profile = getSoulProfile(db, soul.id, { now: 2 * DAY, traitLimit: 2 });
		equal(profile.health, profile.freshness * profile.headroom * profile.evidenceRatio);
		equal(profile.headroom, 0.5);
		equal(profile.evidenceRatio, 1 / 3);
		equal(getSoulProfile(db, soul.id, { traitLimit: 1 }).headroom, 0);
		equal(getSoulProfile(db, soul.id, { now: 100 * DAY }).freshness, 0);
	} finally {
		db.close();
	}
});

test('operator with reason suppresses non-strict essence warnings; strict enforcement and audit remain', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const soul = createSoul(db, { name: 'Correction', essence: 'E', description: 'D' });
		const result = updateSoul(db, soul.id, {
			essence: 'Corrected',
			operator: 'Owner',
			reason: 'Typo',
			strict: false,
		});
		equal(result.warnings, undefined);
		equal(result.essence, 'Corrected');
		throws(() => updateSoul(db, soul.id, { essence: 'Strict', strict: true }), /cited shard/);
		const strict = updateSoul(db, soul.id, {
			essence: 'Operator strict',
			strict: true,
			operator: 'Owner',
			reason: 'Typo',
		});
		match(strict.warnings?.[0] ?? '', /operator correction.*bypassed/);
		ok(
			updateSoul(db, soul.id, { essence: 'No reason', operator: 'Owner', strict: false }).warnings
				?.length,
		);
	} finally {
		db.close();
	}
});

test('planless validation reports blockers successfully and preserves plan validation', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const soul = createSoul(db, { name: 'Validate', essence: 'E', description: 'D' });
		const result = levelUpSoulToolHandler(db, { action: 'validate', soulId: soul.id });
		ok(result.ok);
		ok('blockers' in result.data);
		equal(result.data.ready, false);
		ok(result.data.blockers.length);
		const planned = levelUpSoulToolHandler(db, {
			action: 'validate',
			soulId: soul.id,
			plan: { newEssence: 'New', consolidations: [], promotedTraitIds: [], carriedTraitIds: [] },
		});
		ok(planned.ok);
		ok('valid' in planned.data);
		equal(planned.data.valid, true);
		equal(levelUpSoulToolHandler(db, { action: 'validate', soulId: 9999 }).ok, false);
	} finally {
		db.close();
	}
});

test('active citations align unrelated wording; singleton and single-source clusters never nudge trait additions', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const soul = createSoul(db, { name: 'Aligned', essence: 'E', description: 'D' });
		const trait = addTrait(db, soul.id, {
			principle: 'Review database transactions',
			provenance: 'P',
		});
		const shard = dropShard(db, {
			content: 'Ocean waves and saltwater',
			source: 'a',
			soulIds: [soul.id],
		}).shard;
		citeShard(db, shard.id, trait.id);
		const clusters = clusterShards(listShards(db, { soulId: soul.id }));
		equal(computeTraitAlignment(db, soul.id, clusters)[0]?.kind, 'reinforcing');
		const inspected = inspectSoulsItemToolHandler(db, { soulId: soul.id, includeEvidence: true });
		ok(inspected.ok);
		equal(inspected.data.evidence?.clusters[0]?.alignment.kind, 'reinforcing');
		db.prepare("UPDATE soul_traits SET status='reverted' WHERE id=?").run(trait.id);
		equal(computeTraitAlignment(db, soul.id, clusters)[0]?.kind, 'novel');
		const cluster = { ...clusters[0]!, alignment: { kind: 'novel' as const }, sharedWith: [] };
		const input = {
			traitSignals: [],
			clusters: [cluster],
			consolidationSuggestions: [],
			promotionCandidates: [],
		};
		let actions = computeSuggestedActions(input);
		ok(actions.some((a) => a.includes('uncited') && a.includes('semantically novel')));
		ok(!actions.some((a) => a.includes('consider adding')));
		cluster.members = [shard, { ...shard, id: 999 }];
		actions = computeSuggestedActions(input);
		ok(!actions.some((a) => a.includes('consider adding')));
		cluster.sourceDiversity = 2;
		actions = computeSuggestedActions(input);
		ok(actions.some((a) => a.includes('consider adding')));
	} finally {
		db.close();
	}
});
