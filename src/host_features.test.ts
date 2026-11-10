import { deepEqual, equal, match, ok, throws } from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { test } from 'node:test';
import { getSoulsConfig, resolveStrict, setSoulsConfig } from './config.ts';
import { validateLevelUpPlan } from './levels/validate_level_up_plan.ts';
import { createInitializedSoulsDb } from './lib/test-db.ts';
import { diffSoul, publishSoul, renderPublication, sha256 } from './publication.ts';
import { refineWithEvidence } from './refine_with_evidence.ts';
import { reviewNoChange } from './review.ts';
import { getRevisionHistory } from './revisions.ts';
import { checkCrystallizationForSoul } from './shards/check_crystallization_for_soul.ts';
import { dropShard } from './shards/drop_shard.ts';
import { dropShards } from './shards/drop_shards.ts';
import { createSoul } from './souls/create_soul.ts';
import { getSoul } from './souls/get_soul.ts';
import { renderSoul } from './souls/render_soul.ts';
import { updateSoul } from './souls/update_soul.ts';
import { soulsCliOptions } from './surface/souls_cli_options.ts';
import { runToolCli } from './surfaces/cli.ts';
import { manageSoulToolHandler } from './tools/manage_soul_tool.ts';
import { observeSoulToolHandler } from './tools/observe_soul_tool.ts';
import { reviewSoulsToolHandler } from './tools/review_souls_tool.ts';
import { addTrait } from './traits/add_trait.ts';
import { reactivateTrait } from './traits/reactivate_trait.ts';

const identity = {
	name: 'Reviewer',
	description: 'Review identity',
	essence: 'Read intent before details. '.repeat(8),
};
test('publication creates, replaces, appends, hashes, trims only the block, and refuses conflicts', async () => {
	const db = await createInitializedSoulsDb();
	const dir = mkdtempSync(join(tmpdir(), 'souls-publish-'));
	try {
		const soul = createSoul(db, identity);
		const first = addTrait(db, soul.id, { principle: 'First', provenance: 'Observed', now: 1 });
		const last = addTrait(db, soul.id, { principle: 'Last', provenance: 'Observed', now: 2 });
		equal(renderPublication(db, soul.id).text, renderSoul(db, soul.id));
		equal(
			renderPublication(db, soul.id, { includeProvenance: true }).text,
			renderSoul(db, soul.id, { includeProvenance: true }),
		);
		const file = join(dir, 'prompt.md');
		const result = publishSoul(db, soul.id, { into: file, expectHash: 'none' });
		equal(result.fileHash, sha256(readFileSync(file, 'utf8')));
		equal(diffSoul(db, soul.id, file).same, true);
		const row = db.prepare('SELECT * FROM soul_publications').get();
		equal(row?.file_hash, result.fileHash);
		equal(row?.block_hash, sha256(result.block));
		const original = 'OUTSIDE\n<!-- agent:begin -->\nold\n<!-- agent:end -->\nTAIL';
		writeFileSync(file, original);
		const fixed = 'OUTSIDE\n<!-- agent:begin -->\n\n<!-- agent:end -->\nTAIL';
		const trimmed = publishSoul(db, soul.id, {
			into: file,
			marker: 'agent',
			budget: fixed.length + 45,
		});
		ok(trimmed.text.startsWith('OUTSIDE\n<!-- agent:begin -->\n'));
		ok(trimmed.text.endsWith('\n<!-- agent:end -->\nTAIL'));
		ok(trimmed.text.length <= fixed.length + 45);
		deepEqual(trimmed.trimmed.traitIds, [last.id, first.id]);
		ok(trimmed.trimmed.essenceChars > 0);
		throws(() => publishSoul(db, soul.id, { into: file, marker: 'agent', budget: 1 }), /outside/);
		equal(readFileSync(file, 'utf8'), trimmed.text);
		throws(() => publishSoul(db, soul.id, { into: file, expectHash: 'bad' }), /conflict/);
		equal(readFileSync(file, 'utf8'), trimmed.text);
		const emptyBudget = 'OUTSIDE\n<!-- agent:begin --><!-- agent:end -->\nTAIL'.length;
		const emptied = publishSoul(db, soul.id, { into: file, marker: 'agent', budget: emptyBudget });
		equal(emptied.text, 'OUTSIDE\n<!-- agent:begin --><!-- agent:end -->\nTAIL');
		equal(emptied.trimmed.essenceChars, soul.essence.length);
		const absent = join(dir, 'absent');
		throws(() => publishSoul(db, soul.id, { into: absent, budget: 0 }), /outside/);
		equal(existsSync(absent), false);
		writeFileSync(file, 'Keep this');
		publishSoul(db, soul.id, { into: file });
		ok(readFileSync(file, 'utf8').startsWith('Keep this\n<!-- souls:begin -->'));
		updateSoul(db, soul.id, { essence: 'Changed' });
		const diff = diffSoul(db, soul.id, file);
		equal(diff.same, false);
		ok(diff.added.includes('Changed'));
		ok(diff.removed.includes(identity.essence));
	} finally {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	}
});

test('ingestion keys, occurrence timestamps, references, and backfill spread source gate', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const soul = createSoul(db, identity),
			day = 86400000,
			now = 10 * day;
		const input = {
			content: 'Read the intent of a change',
			source: 'a',
			soulIds: [soul.id],
			occurredAt: new Date(now - 3 * day).toISOString(),
			idempotencyKey: 'one',
			ref: 'issue:1',
			now,
		};
		const one = dropShard(db, input, { readiness: 'legacy' });
		equal(one.shard.createdAt, now);
		equal(one.shard.occurredAt, now - 3 * day);
		equal(one.shard.ref, 'issue:1');
		const duplicate = dropShard(
			db,
			{ ...input, content: 'Different payload' },
			{ readiness: 'legacy' },
		);
		equal(duplicate.duplicate, true);
		equal(duplicate.shard.id, one.shard.id);
		equal(duplicate.shard.content, input.content);
		const batch = dropShards(db, [input, input], { readiness: 'legacy' });
		equal(batch.shards.length, 2);
		equal(batch.results?.[0]?.duplicate, true);
		equal(batch.results?.[1]?.duplicate, true);
		equal(batch.shards[0]?.id, one.shard.id);
		equal(db.prepare('SELECT COUNT(*) AS n FROM soul_shards').get()?.n, 1);
		dropShard(
			db,
			{
				content: 'Avoid invented details',
				source: 'a',
				soulIds: [soul.id],
				occurredAt: now - day,
				now,
			},
			{ readiness: 'legacy' },
		);
		dropShard(
			db,
			{ content: 'Test edge cases', source: 'b', soulIds: [soul.id], now },
			{ readiness: 'legacy' },
		);
		const blocked = checkCrystallizationForSoul(db, soul.id, { readiness: 'legacy', now });
		equal(blocked?.ready, true);
		dropShard(
			db,
			{
				content: 'Verify user requirements',
				source: 'c',
				soulIds: [soul.id],
				occurredAt: now - 2 * day,
				now,
			},
			{ readiness: 'legacy' },
		);
		equal(checkCrystallizationForSoul(db, soul.id, { readiness: 'legacy', now })?.ready, true);
		throws(
			() =>
				dropShard(
					db,
					{ ...input, idempotencyKey: 'invalid', occurredAt: 'invalid' },
					{ readiness: 'legacy' },
				),
			/timestamp/,
		);
	} finally {
		db.close();
	}
});

test('persistent strict precedence reaches evidence, capacity and level gates; operator and no-change reviews', async () => {
	const db = await createInitializedSoulsDb();
	const previous = process.env.GHOSTPAW_SOULS_STRICT;
	try {
		delete process.env.GHOSTPAW_SOULS_STRICT;
		equal(resolveStrict(db), false);
		deepEqual(getSoulsConfig(db), {});
		const soul = createSoul(db, identity);
		setSoulsConfig(db, 'strict', 'true');
		equal(resolveStrict(db), true);
		throws(() => addTrait(db, soul.id, { principle: 'Check', provenance: 'Observed' }), /ready/);
		throws(() => updateSoul(db, soul.id, { essence: 'Changed' }), /ready/);
		const trait = addTrait(db, soul.id, {
			principle: 'Check',
			provenance: 'Observed',
			strict: false,
		});
		updateSoul(db, soul.id, { essence: 'Changed', strict: false });
		for (const value of ['1', 'true', 'yes']) {
			process.env.GHOSTPAW_SOULS_STRICT = value;
			equal(resolveStrict(db), true);
			equal(resolveStrict(db, false), false);
		}
		for (const value of ['0', 'false', 'no']) {
			process.env.GHOSTPAW_SOULS_STRICT = value;
			equal(resolveStrict(db), false);
			equal(resolveStrict(db, true), true);
		}
		delete process.env.GHOSTPAW_SOULS_STRICT;
		db.prepare("UPDATE soul_traits SET status='reverted' WHERE id=?").run(trait.id);
		throws(() => reactivateTrait(db, trait.id, { traitLimit: 0 }), /limit/);
		reactivateTrait(db, trait.id, { traitLimit: 0, strict: false });
		const plan = {
			newEssence: 'New',
			consolidations: [],
			promotedTraitIds: [],
			carriedTraitIds: [trait.id],
		};
		equal(validateLevelUpPlan(db, soul.id, plan, { traitLimit: 0 }).valid, false);
		equal(validateLevelUpPlan(db, soul.id, plan, { traitLimit: 0, strict: false }).valid, true);
		throws(
			() =>
				refineWithEvidence(db, {
					soulId: soul.id,
					action: 'revise',
					traitId: trait.id,
					principle: 'New check',
					provenance: 'Observed',
					shardIds: [],
				}),
			/ready/,
		);
		const corrected = refineWithEvidence(db, {
			soulId: soul.id,
			action: 'revise',
			traitId: trait.id,
			principle: 'Corrected',
			provenance: 'Observed',
			shardIds: [],
			operator: 'Maintainer',
		});
		equal(corrected.principle, 'Corrected');
		ok(
			getRevisionHistory(db, { soulId: soul.id }).some(
				(r) => r.operator === 'Maintainer' && r.reason?.includes('operator correction'),
			),
		);
		reviewNoChange(db, soul.id, { reason: 'Still appropriate', now: 123 });
		equal(getSoul(db, soul.id)?.lastAttunedAt, 123);
		const review = reviewSoulsToolHandler(db, { view: 'history', soulId: soul.id });
		ok(review.ok);
		if (review.ok && 'reviews' in review.data)
			equal(review.data.reviews[0]?.reason, 'Still appropriate');
		const config = manageSoulToolHandler(db, {
			action: 'config_set',
			key: 'strict',
			value: 'false',
		});
		ok(config.ok);
		equal(resolveStrict(db), false);
	} finally {
		if (previous === undefined) delete process.env.GHOSTPAW_SOULS_STRICT;
		else process.env.GHOSTPAW_SOULS_STRICT = previous;
		db.close();
	}
});

test('external binding uniqueness on create/update', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const a = createSoul(db, { ...identity, externalId: 'host:a' });
		equal(a.externalId, 'host:a');
		throws(
			() => createSoul(db, { ...identity, name: 'Other', externalId: 'host:a' }),
			/already bound/,
		);
		const b = createSoul(db, { ...identity, name: 'Second' });
		throws(() => updateSoul(db, b.id, { externalId: 'host:a' }), /already bound/);
		updateSoul(db, a.id, { externalId: null });
		equal(updateSoul(db, b.id, { externalId: 'host:a' }).externalId, 'host:a');
	} finally {
		db.close();
	}
});

test('host CLI render, diff exits, config, external refs, capacity, no-change and report', async () => {
	const dir = mkdtempSync(join(tmpdir(), 'souls-host-cli-'));
	const invoke = async (args: string[], stdin = '') => {
		let out = '',
			err = '';
		const sink = (fn: (s: string) => void) =>
			new Writable({
				write(chunk, _enc, cb) {
					fn(String(chunk));
					cb();
				},
			});
		const code = await runToolCli([...args, '--db', join(dir, 'db')], {
			...soulsCliOptions,
			stdin: Readable.from([stdin]),
			stdout: sink((s) => {
				out += s;
			}),
			stderr: sink((s) => {
				err += s;
			}),
		});
		return { code, out, err };
	};
	try {
		equal(
			(
				await invoke([
					'soul',
					'create',
					'Reviewer',
					'--essence',
					'Read intent',
					'--description',
					'Review',
					'--external-id',
					'one',
				])
			).code,
			0,
		);
		const file = join(dir, 'prompt');
		equal((await invoke(['render', 'ext:one', '--into', file, '--expect-hash', 'none'])).code, 0);
		equal((await invoke(['diff', 'ext:one', '--against', file])).code, 0);
		equal((await invoke(['soul', 'update', 'ext:one', '--essence', 'Changed'])).code, 0);
		equal((await invoke(['diff', 'ext:one', '--against', file])).code, 1);
		const diff = await invoke(['diff', 'ext:one', '--against', file, '--json']);
		equal(JSON.parse(diff.out).same, false);
		const before = readFileSync(file, 'utf8');
		equal((await invoke(['render', 'ext:one', '--into', file, '--expect-hash', 'bad'])).code, 4);
		equal(readFileSync(file, 'utf8'), before);
		equal((await invoke(['config', 'set', 'strict', 'true'])).code, 0);
		equal(JSON.parse((await invoke(['config', 'get', 'strict', '--json'])).out).strict, true);
		equal(
			(
				await invoke([
					'refinement',
					'add',
					'ext:one',
					'--principle',
					'Check',
					'--provenance',
					'Observed',
				])
			).code,
			1,
		);
		equal(
			(
				await invoke([
					'refinement',
					'add',
					'ext:one',
					'--principle',
					'Check',
					'--provenance',
					'Observed',
					'--no-strict',
					'--trait-limit',
					'1',
				])
			).code,
			0,
		);
		equal(
			(
				await invoke([
					'refinement',
					'add',
					'ext:one',
					'--principle',
					'More',
					'--provenance',
					'Observed',
					'--no-strict',
					'--trait-limit',
					'1',
				])
			).code,
			1,
		);
		const trimmed = await invoke(['render', 'ext:one', '--budget', '10', '--json']);
		equal(trimmed.code, 0);
		ok(JSON.parse(trimmed.out).text.length <= 10);
		match(trimmed.err, /trimmed: 1 traits .*essence shortened/);
		equal((await invoke(['review', 'ext:one', '--no-change', '--reason', 'Fine'])).code, 0);
		match((await invoke(['review', 'ext:one'])).out, /no change: Fine/);
		equal((await invoke(['report', '--expect-ids', '@-'], 'one\n')).code, 0);
		const mismatch = await invoke(['report', '--expect-ids', '@-', '--json'], 'two\n');
		equal(mismatch.code, 1);
		deepEqual(JSON.parse(mismatch.out), { missing: ['two'], extra: ['one'] });
		const shard = [
			'shard',
			'drop',
			'Observed intent',
			'--source',
			'review',
			'--soul-ids',
			'1',
			'--occurred-at',
			'2026-10-01T00:00:00Z',
			'--idempotency-key',
			'cli-one',
			'--ref',
			'issue:1',
			'--json',
		];
		equal((await invoke(shard)).code, 0);
		const repeated = JSON.parse((await invoke(shard)).out);
		equal(repeated.data.duplicate, true);
		equal(repeated.data.shard.ref, 'issue:1');
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test('CLI trait-limit reaches reactivate/apply and level validation/execution; operators appear in review', async () => {
	const db = await createInitializedSoulsDb();
	const invoke = async (args: string[]) => {
		let out = '',
			err = '';
		const sink = (fn: (s: string) => void) =>
			new Writable({
				write(chunk, _enc, cb) {
					fn(String(chunk));
					cb();
				},
			});
		const code = await runToolCli([...args, '--json'], {
			...soulsCliOptions,
			openContext: () => db,
			closeContext: () => {},
			stdin: Readable.from([]),
			stdout: sink((s) => {
				out += s;
			}),
			stderr: sink((s) => {
				err += s;
			}),
		});
		return { code, out, err };
	};
	try {
		createSoul(db, { ...identity, externalId: 'bound' });
		const added = await invoke([
			'refinement',
			'add',
			'ext:bound',
			'--principle',
			'Check',
			'--provenance',
			'Evidence',
			'--strict',
			'--operator',
			'Operator',
		]);
		equal(added.code, 0);
		const id = String(JSON.parse(added.out).data.trait.id);
		equal(
			(
				await invoke([
					'refinement',
					'revise',
					id,
					'--principle',
					'Corrected',
					'--operator',
					'Operator',
				])
			).code,
			0,
		);
		const history = JSON.parse((await invoke(['review', 'ext:bound'])).out).history;
		ok(history.filter((r: { operator: string }) => r.operator === 'Operator').length >= 2);
		db.prepare("UPDATE soul_traits SET status='reverted' WHERE id=?").run(Number(id));
		equal(
			(await invoke(['refinement', 'reactivate', id, '--strict', '--trait-limit', '0'])).code,
			1,
		);
		equal(
			(await invoke(['refinement', 'reactivate', id, '--strict', '--trait-limit', '1'])).code,
			0,
		);
		const applied = [
			'refinement',
			'apply',
			'ext:bound',
			'--principle',
			'Second',
			'--provenance',
			'Evidence',
			'--shard-ids',
			'1',
			'--trait-limit',
			'1',
		];
		equal((await invoke(applied)).code, 1);
		const plan = JSON.stringify({
			newEssence: 'Leveled',
			consolidations: [],
			promotedTraitIds: [],
			carriedTraitIds: [Number(id)],
		});
		const validate = await invoke([
			'level',
			'validate',
			'--soul-id=ext:bound',
			'--plan',
			plan,
			'--strict',
			'--trait-limit',
			'0',
		]);
		equal(validate.code, 0);
		equal(JSON.parse(validate.out).data.valid, false);
		equal(
			(
				await invoke([
					'level',
					'up',
					'ext:bound',
					'--plan',
					plan,
					'--strict',
					'--trait-limit',
					'0',
					'--readiness',
					'legacy',
				])
			).code,
			1,
		);
		equal(
			(
				await invoke([
					'level',
					'up',
					'ext:bound',
					'--plan',
					plan,
					'--strict',
					'--trait-limit',
					'1',
					'--readiness',
					'legacy',
				])
			).code,
			0,
		);
		equal(
			(
				await invoke([
					'shard',
					'drop',
					'Observed',
					'--source',
					'test',
					'--soul-ids',
					'ext:bound',
					'--occurred-at',
					'2026-10-01',
				])
			).code,
			0,
		);
	} finally {
		db.close();
	}
});

test('additive migrations preserve existing rows and remain repeatable', async () => {
	const { openTestDatabase } = await import('./lib/open-test-database.ts');
	const { initSoulsTables } = await import('./init_souls_tables.ts');
	const db = await openTestDatabase();
	try {
		db.exec(`CREATE TABLE souls (id INTEGER PRIMARY KEY,name TEXT NOT NULL,slug TEXT,essence TEXT NOT NULL,description TEXT NOT NULL,level INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,deleted_at INTEGER,last_attuned_at INTEGER) STRICT;
 INSERT INTO souls (id,name,essence,description,created_at,updated_at) VALUES (1,'Existing','Preserved','Original',1,1);
 CREATE TABLE soul_shards (id INTEGER PRIMARY KEY,content TEXT NOT NULL,source TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',sealed INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL) STRICT;
 INSERT INTO soul_shards (id,content,source,created_at,updated_at) VALUES (1,'Legacy shard','original',1,1);`);
		initSoulsTables(db);
		initSoulsTables(db);
		equal(getSoul(db, 1)?.essence, 'Preserved');
		equal(db.prepare('SELECT content FROM soul_shards WHERE id=1').get()?.content, 'Legacy shard');
		equal(updateSoul(db, 1, { externalId: 'existing' }).externalId, 'existing');
		setSoulsConfig(db, 'strict', 'true');
		equal(getSoulsConfig(db).strict, 'true');
		process.env.GHOSTPAW_SOULS_STRICT = 'yes';
		throws(() => addTrait(db, 1, { principle: 'Evidence', provenance: 'Observed' }), /ready/);
		addTrait(db, 1, { principle: 'Override', provenance: 'Observed', strict: false });
	} finally {
		delete process.env.GHOSTPAW_SOULS_STRICT;
		db.close();
	}
});

test('legacy numeric facade timestamps preserve creation time without disguising backfills', async () => {
	const db = await createInitializedSoulsDb();
	try {
		const soul = createSoul(db, identity),
			day = 86400000,
			now = 10 * day;
		for (const [i, source] of ['a', 'a'].entries()) {
			const result = observeSoulToolHandler(db, {
				readiness: 'legacy',
				action: 'drop',
				content: ['Check source code', 'Read user intent'][i] as string,
				source,
				soulIds: [soul.id],
				occurredAt: now - (3 - i) * day,
				now,
			});
			ok(result.ok);
			if (result.ok && 'shard' in result.data) {
				equal(result.data.shard.createdAt, now - (3 - i) * day);
				equal(result.data.shard.insertedAt, now);
			}
		}
		dropShard(
			db,
			{
				content: 'Verify database transactions',
				source: 'b',
				soulIds: [soul.id],
				now,
			},
			{ readiness: 'legacy' },
		);
		equal(checkCrystallizationForSoul(db, soul.id, { readiness: 'legacy', now })?.ready, true);
		observeSoulToolHandler(db, {
			readiness: 'legacy',
			action: 'drop',
			content: 'Preserve regression assertions',
			source: 'c',
			soulIds: [soul.id],
			occurredAt: now - day,
			now,
		});
		equal(checkCrystallizationForSoul(db, soul.id, { readiness: 'legacy', now })?.ready, true);
	} finally {
		db.close();
	}
});
