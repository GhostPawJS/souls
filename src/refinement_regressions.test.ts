import { deepStrictEqual, equal, match, ok, throws } from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import type { SoulsDb } from './database.ts';
import { initSoulsTables } from './init_souls_tables.ts';
import { levelUp } from './levels/level_up.ts';
import { revertLevelUp } from './levels/revert_level_up.ts';
import { validateLevelUpPlan } from './levels/validate_level_up_plan.ts';
import { createInitializedSoulsDb } from './lib/test-db.ts';
import { runMaintenance } from './maintenance.ts';
import { refineWithEvidence } from './refine_with_evidence.ts';
import { getRevisionHistory } from './revisions.ts';
import { citeShard } from './shards/cite_shard.ts';
import { computeTraitAlignment } from './shards/compute_trait_alignment.ts';
import { computeTraitSignals } from './shards/compute_trait_signals.ts';
import { detectTraitTensions } from './shards/detect_trait_tensions.ts';
import { dropShard } from './shards/drop_shard.ts';
import { formatEvidence } from './shards/format_evidence.ts';
import { listShards, listShardsPage } from './shards/list_shards.ts';
import { renderEvidenceMarkdown } from './shards/render_evidence_markdown.ts';
import { searchShards, searchShardsPage } from './shards/search_shards.ts';
import { createSoul } from './souls/create_soul.ts';
import { getSoul } from './souls/get_soul.ts';
import { updateSoul } from './souls/update_soul.ts';
import { inspectSoulsItemToolHandler } from './tools/inspect_souls_item_tool.ts';
import { manageSoulToolHandler } from './tools/manage_soul_tool.ts';
import { observeSoulTool, observeSoulToolHandler } from './tools/observe_soul_tool.ts';
import { refineSoulToolHandler } from './tools/refine_soul_tool.ts';
import { searchSoulsToolHandler } from './tools/search_souls_tool.ts';
import { addTrait } from './traits/add_trait.ts';
import { getTrait } from './traits/get_trait.ts';
import { reactivateTrait } from './traits/reactivate_trait.ts';
import { revertTrait } from './traits/revert_trait.ts';
import { reviseTrait } from './traits/revise_trait.ts';

let db: SoulsDb;
let soulId: number;
const day = 86_400_000;
beforeEach(async () => {
	db = await createInitializedSoulsDb();
	soulId = createSoul(db, {
		name: 'Regression',
		essence: 'Original essence',
		description: 'Test',
		now: day,
	}).id;
});
afterEach(() => db.close());
function shard(content = 'Repeated evidence', extra = {}) {
	return dropShard(db, { content, source: 'test', soulIds: [soulId], now: day * 2, ...extra })
		.shard;
}
function trait(principle = 'Read carefully') {
	return addTrait(db, soulId, { principle, provenance: 'Observed', now: day * 2 });
}

test('shard arrays retain their shape, with bounded paging and status filters', () => {
	for (let i = 0; i < 105; i++) shard(`Evidence ${i}`);
	const sealed = shard('Evidence sealed', { sealed: true });
	const faded = shard('Evidence faded');
	db.prepare("UPDATE soul_shards SET status='faded' WHERE id=?").run(faded.id);
	equal(listShards(db).length, 100);
	equal(searchShards(db, 'Evidence').length, 100);
	deepStrictEqual(listShardsPage(db, { limit: 2, offset: 104 }), {
		items: listShards(db, { limit: 2, offset: 104 }),
		total: 105,
		hasMore: false,
	});
	equal(listShardsPage(db, { status: 'all', limit: 2000 }).items.length, 107);
	equal(listShardsPage(db, { status: 'sealed' }).items[0]?.id, sealed.id);
	equal(searchShardsPage(db, 'Evidence', { status: 'faded' }).items[0]?.id, faded.id);
	equal(searchShardsPage(db, 'Evidence', { limit: 1 }).total, 107);
	equal(searchShardsPage(db, 'Evidence', { limit: 1 }).hasMore, true);
	equal(searchShardsPage(db, ' ').total, 0);
	const result = searchSoulsToolHandler(db, { status: 'all', limit: 2 });
	ok(result.ok);
	equal(result.data.total, 107);
	equal(result.data.hasMore, true);
});

test('evidence ANDs query and tags, caps payload and markdown, and supports full payload', () => {
	for (let i = 0; i < 8; i++) shard('Matching observation repeated', { tags: ['keep'] });
	shard('Matching observation excluded', { tags: ['other'] });
	const report = formatEvidence(db, soulId, {
		query: 'Matching',
		tags: ['keep'],
		clusterThreshold: 0.1,
	});
	equal(report.pendingCount, 8);
	equal(report.clusters[0]?.members.length, 5);
	match(report.renderedMarkdown, /\+3 more/);
	match(renderEvidenceMarkdown(report), /\+3 more/);
	equal(
		formatEvidence(db, soulId, { maxMembersPerCluster: 2, clusterThreshold: 0.1 }).clusters[0]
			?.members.length,
		2,
	);
	equal(
		formatEvidence(db, soulId, { full: true, clusterThreshold: 0.1 }).clusters[0]?.members.length,
		9,
	);
});

test('new evidence gates warn by default and reject strict additions and essence edits', () => {
	ok(trait().warnings?.length);
	throws(
		() => addTrait(db, soulId, { principle: 'Strict', provenance: 'Evidence', strict: true }),
		/crystallization-ready/,
	);
	throws(() => updateSoul(db, soulId, { essence: 'Strict', strict: true }), /cited shard/);
	const updated = updateSoul(db, soulId, { essence: 'Allowed' });
	ok(updated.warnings?.length);
	equal(updated.essence, 'Allowed');
	equal(getRevisionHistory(db, { soulId }).length, 2);
});

test('strict readiness and cited evidence are both required; operator corrections are audited', () => {
	const now = Date.now();
	shard('Carefully inspect changes', { source: 'review', now: now - day * 3 });
	shard('Document design assumptions', { source: 'feedback', now: now - day });
	const cited = shard('Test reported failures', { source: 'execution', now });
	throws(
		() =>
			addTrait(db, soulId, {
				readiness: 'legacy',
				principle: 'Rule',
				provenance: 'Evidence',
				strict: true,
				now,
			}),
		/cited shard/,
	);
	const added = addTrait(db, soulId, {
		readiness: 'legacy',
		principle: 'Rule',
		provenance: 'Evidence',
		strict: true,
		shardIds: [cited.id],
		now,
	});
	equal(added.warnings, undefined);
	equal(
		db
			.prepare('SELECT COUNT(*) AS n FROM shard_citations WHERE trait_id=?')
			.get<{ n: number }>(added.id)?.n,
		1,
	);
	updateSoul(db, soulId, {
		readiness: 'legacy',
		essence: 'Evidence essence',
		strict: true,
		shardIds: [cited.id],
		now,
	});
	equal(db.prepare('SELECT COUNT(*) AS n FROM soul_revision_shards').get<{ n: number }>()?.n, 1);
	const corrected = addTrait(db, soulId, {
		readiness: 'legacy',
		principle: 'Correction',
		provenance: 'Operator',
		strict: true,
		operator: 'maintainer',
		reason: 'Typo',
	});
	const revision = getRevisionHistory(db, { traitId: corrected.id })[0];
	equal(revision?.operator, 'maintainer');
	match(revision?.reason ?? '', /operator correction/);
});

test('citation failure rolls back trait and essence revisions', () => {
	const before = getRevisionHistory(db, { soulId }).length;
	throws(() =>
		addTrait(db, soulId, { principle: 'No orphan', provenance: 'Evidence', shardIds: [9999] }),
	);
	equal(db.prepare('SELECT COUNT(*) AS n FROM soul_traits').get<{ n: number }>()?.n, 0);
	throws(() => updateSoul(db, soulId, { essence: 'No change', shardIds: [9999] }));
	equal(getSoul(db, soulId)?.essence, 'Original essence');
	equal(getRevisionHistory(db, { soulId }).length, before);
});

test('revision history filters, reasons, and opt-in inspect history', () => {
	const t = trait();
	reviseTrait(db, t.id, { principle: 'Revised', reason: 'Clearer' });
	const history = getRevisionHistory(db, { traitId: t.id, limit: 1 });
	equal(history.length, 1);
	equal(history[0]?.oldText, t.principle);
	equal(history[0]?.newText, 'Revised');
	equal(history[0]?.reason, 'Clearer');
	const plain = inspectSoulsItemToolHandler(db, { soulId });
	ok(plain.ok);
	equal(plain.data.history, undefined);
	const withHistory = inspectSoulsItemToolHandler(db, { soulId, history: true });
	ok(withHistory.ok);
	equal(withHistory.data.history?.length, 2);
});

test('level reversion restores original trait state and essence, retaining merge citations and unrelated faded shards', () => {
	const a = trait('Rule one'),
		b = trait('Rule two');
	const evidence = shard();
	citeShard(db, evidence.id, a.id);
	const unrelated = shard('Previously faded');
	db.prepare("UPDATE soul_shards SET status='faded' WHERE id=?").run(unrelated.id);
	const before = db.prepare('SELECT * FROM soul_traits ORDER BY id').all();
	const result = levelUp(db, soulId, {
		newEssence: 'Next',
		consolidations: [
			{ sourceTraitIds: [a.id, b.id], mergedPrinciple: 'Merged', mergedProvenance: 'Both' },
		],
		promotedTraitIds: [],
		carriedTraitIds: [],
	});
	const merged = result.snapshot.traitsMerged[0] as number;
	citeShard(db, evidence.id, merged);
	reviseTrait(db, a.id, { principle: 'Temporary wording' });
	revertLevelUp(db, soulId);
	deepStrictEqual(
		db.prepare('SELECT * FROM soul_traits WHERE id IN (?,?) ORDER BY id').all(a.id, b.id),
		before,
	);
	equal(getTrait(db, merged)?.status, 'reverted');
	equal(db.prepare('SELECT COUNT(*) AS n FROM shard_citations').get<{ n: number }>()?.n, 2);
	equal(getSoul(db, soulId)?.essence, 'Original essence');
	equal(listShards(db, { status: 'faded' })[0]?.id, unrelated.id);
	ok(getRevisionHistory(db, { soulId }).some((r) => r.reason === 'revert level up'));
});

test('legacy snapshots use the documented fallback and issue a warning', () => {
	const t = trait();
	const faded = shard();
	levelUp(db, soulId, {
		newEssence: 'Next',
		consolidations: [],
		promotedTraitIds: [],
		carriedTraitIds: [t.id],
	});
	db.prepare('UPDATE soul_levels SET faded_shard_ids=NULL, state_before=NULL').run();
	db.prepare("UPDATE soul_shards SET status='faded' WHERE id=?").run(faded.id);
	const warnings: string[] = [];
	revertLevelUp(db, soulId, { onWarning: (w) => warnings.push(w) });
	match(warnings[0] ?? '', /Legacy/);
	equal(listShards(db)[0]?.id, faded.id);
});

test('capacity and merge validation warns by default and rejects in strict', () => {
	const t = trait();
	const plan = {
		newEssence: 'Next',
		consolidations: [{ sourceTraitIds: [], mergedPrinciple: '', mergedProvenance: '' }],
		carriedTraitIds: [t.id],
		promotedTraitIds: [],
	};
	const validation = validateLevelUpPlan(db, soulId, plan, { traitLimit: 1 });
	equal(validation.valid, true);
	ok(validation.errors?.length);
	ok(validation.warnings?.length);
	equal(validateLevelUpPlan(db, soulId, plan, { strict: true, traitLimit: 1 }).valid, false);
	throws(() => levelUp(db, soulId, plan, { strict: true, traitLimit: 1 }), /exceeds trait limit/);
	ok(
		levelUp(
			db,
			soulId,
			{
				...plan,
				consolidations: [
					{ sourceTraitIds: [], mergedPrinciple: 'Extra', mergedProvenance: 'Evidence' },
				],
			},
			{ traitLimit: 1 },
		).warnings?.length,
	);
});

test('semantic validation warns about weak consolidation and premature promotion', () => {
	const a = trait('Review code'),
		b = trait('Water flowers'),
		c = trait('Test changes');
	const result = validateLevelUpPlan(db, soulId, {
		newEssence: 'Next',
		consolidations: [
			{ sourceTraitIds: [a.id, b.id], mergedPrinciple: 'Combined', mergedProvenance: 'Both' },
		],
		carriedTraitIds: [],
		promotedTraitIds: [c.id],
	});
	ok(result.warnings?.some((w) => w.startsWith('Weak')));
	ok(result.warnings?.some((w) => w.startsWith('Premature')));
});

test('reactivation preserves default behavior at capacity and enforces strict only', () => {
	const t = trait();
	revertTrait(db, t.id);
	trait('Another');
	throws(() => reactivateTrait(db, t.id, { strict: true, traitLimit: 1 }), /trait limit/);
	ok(reactivateTrait(db, t.id, { traitLimit: 1 }).warnings?.length);
});

test('staleness follows latest citation time instead of wording updates', () => {
	const t = trait();
	const s = shard();
	reviseTrait(db, t.id, { principle: 'Recently edited', now: day * 200 });
	equal(computeTraitSignals(db, soulId, { now: day * 200 })[0]?.stale, true);
	citeShard(db, s.id, t.id, { now: day * 190 });
	equal(computeTraitSignals(db, soulId, { now: day * 200 })[0]?.stale, false);
});

test('alignment takes maximum member similarity and negation words extend English cues', () => {
	trait('Review code carefully');
	const report = formatEvidence(db, soulId);
	const a = shard('Unrelated flowers'),
		b = shard('Review code carefully');
	equal(
		computeTraitAlignment(db, soulId, [
			{
				members: [a, b],
				weight: 1,
				sourceDiversity: 1,
				avgFreshness: 1,
				alignment: { kind: 'novel' },
				sharedWith: [],
			},
		])[0]?.kind,
		'reinforcing',
	);
	const signal = {
		traitId: 1,
		principle: 'review code carefully',
		tenure: 1,
		citationCount: 0,
		citationDensity: 0,
		essenceRedundancy: 0,
		stale: false,
		survivalCount: 0,
	};
	const signals = [signal, { ...signal, traitId: 2, principle: 'nicht review code carefully' }];
	equal(detectTraitTensions(signals).length, 0);
	equal(detectTraitTensions(signals, { negationWords: ['nicht'] }).length, 1);
	trait('nicht Review code carefully');
	equal(formatEvidence(db, soulId).tensions.length, 0);
	equal(formatEvidence(db, soulId, { negationWords: ['nicht'] }).tensions.length, 1);
	equal(report.soulId, soulId);
});

test('atomic refinement checks revisions and rolls back every stage on failure', () => {
	const evidence = shard();
	const added = refineWithEvidence(db, {
		soulId,
		action: 'add',
		principle: 'Atomic',
		provenance: 'Observed',
		shardIds: [evidence.id],
		expectedRevision: 0,
		now: day * 3,
	});
	equal(getSoul(db, soulId)?.lastAttunedAt, day * 3);
	throws(
		() =>
			refineWithEvidence(db, {
				soulId,
				action: 'revise',
				traitId: added.id,
				principle: 'Conflict',
				provenance: 'Observed',
				shardIds: [evidence.id],
				expectedRevision: 0,
			}),
		/conflict/,
	);
	const revision = getRevisionHistory(db, { soulId })[0]?.id;
	throws(() =>
		refineWithEvidence(db, {
			soulId,
			action: 'revise',
			traitId: added.id,
			principle: 'Rollback',
			provenance: 'Observed',
			shardIds: [999],
			expectedRevision: revision,
			now: day * 4,
		}),
	);
	equal(getTrait(db, added.id)?.principle, 'Atomic');
	equal(getSoul(db, soulId)?.lastAttunedAt, day * 3);
	equal(getRevisionHistory(db, { soulId }).length, 1);
	const result = refineSoulToolHandler(db, {
		action: 'refine_with_evidence',
		soulId,
		traitId: added.id,
		principle: 'Applied',
		provenance: 'Evidence',
		shardIds: [evidence.id],
		expectedRevision: revision,
	});
	ok(result.ok);
	equal(result.data.trait?.principle, 'Applied');
});

test('facades expose timestamps, complete batch inputs, slug, and trait capacity override', () => {
	const result = observeSoulToolHandler(db, {
		action: 'drop',
		content: 'Earlier',
		source: 'test',
		soulIds: [soulId],
		occurredAt: day,
		now: day * 2,
	});
	ok(result.ok);
	ok('shard' in result.data);
	equal(result.data.shard.createdAt, day);
	const schema = observeSoulTool.inputSchema.properties?.shards as {
		items: { properties: Record<string, unknown> };
	};
	for (const key of ['content', 'source', 'soulIds', 'tags', 'sealed', 'now'])
		ok(schema.items.properties[key]);
	const managed = manageSoulToolHandler(db, { action: 'update', soulId, slug: 'regression' });
	ok(managed.ok);
	equal(managed.data.soul.slug, 'regression');
	for (let i = 0; i < 11; i++)
		ok(
			refineSoulToolHandler(db, {
				action: 'add_trait',
				soulId,
				principle: `Rule ${i}`,
				provenance: 'Observed',
				traitLimit: 12,
			}).ok,
		);
});

test('additive migrations are idempotent and maintenance rolls back fading on failure', () => {
	initSoulsTables(db);
	initSoulsTables(db);
	const s = shard();
	const a = trait('A'),
		b = trait('B'),
		c = trait('C');
	for (const t of [a, b, c]) citeShard(db, s.id, t.id);
	const failing: SoulsDb = {
		exec: (sql) => db.exec(sql),
		close: () => {},
		prepare: (sql) => {
			if (sql.includes('SELECT id FROM souls WHERE deleted_at IS NULL'))
				throw new Error('readiness failure');
			return db.prepare(sql);
		},
	};
	throws(() => runMaintenance(failing), /readiness failure/);
	equal(listShards(db)[0]?.id, s.id);
});

test('legacy databases migrate without losing traits, citations, or shards', () => {
	const t = trait();
	const s = shard();
	citeShard(db, s.id, t.id);
	db.exec(
		'DROP TABLE soul_revision_shards; DROP TABLE soul_revisions; ALTER TABLE shard_citations DROP COLUMN created_at; ALTER TABLE soul_levels DROP COLUMN state_before; ALTER TABLE soul_levels DROP COLUMN faded_shard_ids',
	);
	initSoulsTables(db);
	initSoulsTables(db);
	equal(getTrait(db, t.id)?.principle, t.principle);
	equal(listShards(db)[0]?.id, s.id);
	equal(db.prepare('SELECT COUNT(*) AS n FROM shard_citations').get<{ n: number }>()?.n, 1);
	reviseTrait(db, t.id, { principle: 'Migrated' });
	equal(getRevisionHistory(db, { soulId })[0]?.newText, 'Migrated');
});

test('explicit shard limits cap at 1000 and totals remain uncapped', () => {
	const insert = db.prepare(
		"INSERT INTO soul_shards(content,source,created_at,updated_at) VALUES ('Bounded evidence','test',?,?)",
	);
	for (let i = 0; i < 1005; i++) insert.run(i, i);
	equal(listShards(db, { limit: 2000 }).length, 1000);
	equal(searchShards(db, 'Bounded', { limit: 2000 }).length, 1000);
	const page = searchShardsPage(db, 'Bounded', { limit: 2000 });
	equal(page.total, 1005);
	equal(page.hasMore, true);
});

test('recorded faded shard restoration leaves unrelated faded shards untouched', () => {
	const t = trait(),
		owned = shard('Level evidence'),
		unrelated = shard('Other evidence');
	levelUp(db, soulId, {
		newEssence: 'Next',
		consolidations: [],
		promotedTraitIds: [],
		carriedTraitIds: [t.id],
	});
	db.prepare('UPDATE soul_levels SET faded_shard_ids=?').run(JSON.stringify([owned.id]));
	db.prepare("UPDATE soul_shards SET status='faded'").run();
	revertLevelUp(db, soulId);
	equal(listShards(db)[0]?.id, owned.id);
	equal(listShards(db, { status: 'faded' })[0]?.id, unrelated.id);
});

test('strict level plans accept a reduction above the cap or a result within the cap, and reject unchanged excess', () => {
	const a = trait('Read changes carefully'),
		b = trait('Read changes carefully'),
		c = trait('Read changes carefully');
	const unchanged = {
		newEssence: 'Next',
		consolidations: [],
		promotedTraitIds: [],
		carriedTraitIds: [a.id, b.id, c.id],
	};
	equal(validateLevelUpPlan(db, soulId, unchanged, { strict: true, traitLimit: 2 }).valid, false);
	equal(validateLevelUpPlan(db, soulId, unchanged, { strict: true, traitLimit: 3 }).valid, true);
	const reduced = {
		...unchanged,
		consolidations: [
			{
				sourceTraitIds: [a.id, b.id],
				mergedPrinciple: 'Read changes carefully',
				mergedProvenance: 'Both',
			},
		],
		carriedTraitIds: [c.id],
	};
	equal(validateLevelUpPlan(db, soulId, reduced, { strict: true, traitLimit: 1 }).valid, true);
});
