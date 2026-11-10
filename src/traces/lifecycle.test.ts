import { deepStrictEqual, ok, strictEqual, throws } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';
import type { SoulsDb } from '../database.ts';
import { SoulsConflictError, SoulsValidationError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import * as read from '../read.ts';
import { createSoul } from '../souls/create_soul.ts';
import { renderSoul } from '../souls/render_soul.ts';
import * as write from '../write.ts';

const NOW = Date.UTC(2026, 10, 10);
const DAY = 86400000;
let db: SoulsDb;
let soulId: number;
beforeEach(async () => {
	db = await createInitializedSoulsDb();
	soulId = createSoul(db, {
		name: 'Mentor',
		essence: 'Read carefully',
		description: 'A reviewer',
		now: NOW,
	}).id;
});
afterEach(() => db.close());
const record = () =>
	write.recordTrace(db, {
		text: 'Review the draft',
		tz: 'UTC',
		souls: [{ soulId, role: 'owner' }],
		tags: [' Promise ', 'promise'],
		weight: 0.8,
		dueAt: '2026-11-12',
		now: NOW,
	});
describe('trace lifecycle', () => {
	it('keeps reads lazy and default rendering identical', () => {
		const before = renderSoul(db, soulId);
		strictEqual(read.traceTablesExist(db), false);
		deepStrictEqual(read.listTraces(db), { traces: [], total: 0, truncated: false, next: null });
		deepStrictEqual(read.traceHistory(db, 1), []);
		deepStrictEqual(read.traceChain(db, 1), { traces: [], certainty: null });
		read.changedSince(db, NOW, { now: NOW });
		read.traceStats(db);
		strictEqual(read.traceTablesExist(db), false);
		record();
		strictEqual(renderSoul(db, soulId), before);
		ok(renderSoul(db, soulId, { traces: 'open' }).includes('Open commitments'));
	});
	it('records typed links and an immutable full snapshot', () => {
		const t = record();
		strictEqual(t.revision, 1);
		strictEqual(t.state, 'open');
		deepStrictEqual(t.tags, ['promise']);
		strictEqual(t.souls[0]?.role, 'owner');
		strictEqual(t.dueAt, Date.UTC(2026, 10, 12, 23, 59, 59, 999));
		deepStrictEqual(read.traceHistory(db, t.id)[0]?.snapshot, t);
		throws(
			() => db.prepare('UPDATE soul_trace_revisions SET reason=?').run('rewritten'),
			/append-only/,
		);
		throws(() => db.exec('DELETE FROM soul_trace_revisions'), /append-only/);
		throws(() => db.exec('DELETE FROM soul_traces'), /cannot be deleted/);
	});
	it('revises, links, tags, unlinks, untags and settles with ordered history', () => {
		const t = record();
		const other = createSoul(db, { name: 'Fox', essence: 'e', description: 'd' });
		write.reviseTrace(db, t.id, {
			text: 'Read the final draft',
			reason: 'Clarification',
			now: NOW + 1,
		});
		write.linkTraceSoul(db, t.id, other.id, 1, { now: NOW + 2 });
		write.tagTrace(db, t.id, ['Approval'], { now: NOW + 3 });
		write.unlinkTraceSoul(db, t.id, other.id, 'counterpart', {
			reason: 'Wrong party',
			now: NOW + 4,
		});
		write.untagTrace(db, t.id, ['approval'], { reason: 'Wrong category', now: NOW + 5 });
		const done = write.settleTrace(db, t.id, {
			as: 'done',
			reason: 'Reviewed',
			at: NOW + 6,
			now: NOW + 7,
		});
		strictEqual(done.revision, 7);
		strictEqual(done.settledAt, NOW + 6);
		deepStrictEqual(
			read.traceHistory(db, t.id).map((r) => r.kind),
			['record', 'revise', 'link', 'tag', 'unlink', 'untag', 'settle'],
		);
		throws(
			() => write.settleTrace(db, t.id, { as: 'dropped', reason: 'Again' }),
			SoulsConflictError,
		);
		write.reviseTrace(db, t.id, { text: 'Final draft reviewed', reason: 'Correction' });
		strictEqual(read.getTrace(db, t.id)?.state, 'done');
	});
	it('rejects credentials and invalid writes atomically', () => {
		for (const text of [
			'password=abc',
			'ghp_abcdefgh',
			'-----BEGIN RSA PRIVATE KEY-----',
			'sk-12345678901234567890',
			'AKIA1234567890123456',
			'xoxb-abc',
			`npm_${'a'.repeat(36)}`,
		])
			throws(
				() => write.recordTrace(db, { text, souls: [{ soulId, role: 0 }], now: NOW }),
				SoulsValidationError,
			);
		strictEqual(read.traceTablesExist(db), false);
		const t = record();
		throws(
			() => write.reviseTrace(db, t.id, { text: 'Changed', reason: 'secret: abc' }),
			/credential/,
		);
		strictEqual(read.getTrace(db, t.id)?.revision, 1);
		throws(() => write.recordTrace(db, { text: 'x', souls: [], now: NOW }), /soul link/);
		throws(
			() => write.recordTrace(db, { text: 'x', souls: [{ soulId, role: 0 }], weight: 2 }),
			/weight/,
		);
	});
	it('enforces linear chains and exact weighted certainty', () => {
		const first = record();
		const second = write.recordTrace(db, {
			text: 'Correction',
			souls: [{ soulId, role: 0 }],
			supersedes: first.id,
			weight: 0.2,
			now: NOW + 1,
		});
		strictEqual(read.traceChain(db, first.id).certainty, (0.2 + 0.8 * 0.5) / 1.5);
		deepStrictEqual(
			read.traceChain(db, first.id).traces.map((t) => t.id),
			[second.id, first.id],
		);
		strictEqual(read.listTraces(db).total, 1);
		strictEqual(read.listTraces(db, { includeSuperseded: true }).total, 2);
		throws(
			() =>
				write.recordTrace(db, { text: 'Fork', souls: [{ soulId, role: 0 }], supersedes: first.id }),
			SoulsConflictError,
		);
		throws(
			() => write.reviseTrace(db, first.id, { supersedes: second.id, reason: 'cycle' }),
			/cycle/,
		);
		throws(
			() => write.reviseTrace(db, first.id, { supersedes: first.id, reason: 'self' }),
			/itself/,
		);
	});
	it('cites shards atomically and renders evidence links', () => {
		const t = record();
		const s = write.dropShard(db, {
			content: 'Reviewed a difficult draft carefully',
			source: 'review',
			soulIds: [soulId],
			traceIds: [t.id],
			now: NOW,
		});
		strictEqual(read.getTrace(db, t.id)?.revision, 2);
		ok(
			read
				.formatEvidence(db, soulId, { now: NOW })
				.renderedMarkdown.includes(`backs: trace #${t.id} (open)`),
		);
		const count = db.prepare('SELECT count(*) AS n FROM soul_shards').get<{ n: number }>()?.n;
		throws(() =>
			write.dropShard(db, {
				content: 'x',
				source: 'review',
				soulIds: [soulId],
				traceIds: [999],
				now: NOW,
			}),
		);
		strictEqual(db.prepare('SELECT count(*) AS n FROM soul_shards').get<{ n: number }>()?.n, count);
		deepStrictEqual(
			db
				.prepare('SELECT trace_id FROM shard_traces WHERE shard_id=?')
				.all(s.shard.id)
				.map((r) => r.trace_id),
			[t.id],
		);
	});
	it('filters, paginates, orders due work, and computes exact statistics', () => {
		const other = createSoul(db, { name: 'Fox', essence: 'e', description: 'd' });
		const links = [
			{ soulId, role: 0 as const },
			{ soulId: other.id, role: 1 as const },
		];
		const a = write.recordTrace(db, {
			text: 'Overdue promise',
			souls: links,
			dueAt: NOW - DAY,
			createdAt: NOW - 30 * DAY,
			weight: 0.8,
			now: NOW,
		});
		const b = write.recordTrace(db, {
			text: 'Completed promise',
			souls: links,
			dueAt: NOW - DAY,
			now: NOW,
		});
		write.settleTrace(db, b.id, { as: 'done', reason: 'Delivered', now: NOW });
		write.recordTrace(db, { text: 'Upcoming promise', souls: links, dueAt: NOW + DAY, now: NOW });
		deepStrictEqual(
			read.dueTraces(db, { now: NOW }).map((t) => t.id),
			[a.id, 3],
		);
		const page = read.listTraces(db, {
			soulId,
			role: 'owner',
			state: 'open',
			query: 'promise',
			limit: 1,
		});
		strictEqual(page.total, 2);
		strictEqual(page.traces.length, 1);
		const stats = read.traceStats(db, { soulId, withSoulId: other.id, now: NOW });
		strictEqual(stats.promiseSettleRate, 0.5);
		deepStrictEqual(stats.overdue, [{ soulId, count: 1 }]);
		strictEqual(stats.weights.find((w) => w.id === a.id)?.weight, 0.4);
		const changes = read.changedSince(db, NOW - DAY - 1, { now: NOW });
		strictEqual(changes.cursor, NOW);
		strictEqual(changes.newlyDue.length, 1);
	});
});

it('derives trace ids behind trait and essence revisions, and falls back when SQL pow is unavailable', () => {
	const t = record();
	const s = write.dropShard(db, {
		content: 'Checked evidence carefully',
		source: 'review',
		soulIds: [soulId],
		traceIds: [t.id],
		now: NOW,
	}).shard;
	const trait = write.addTrait(db, soulId, {
		principle: 'Check evidence',
		provenance: 'Review',
		shardIds: [s.id],
		now: NOW,
	});
	deepStrictEqual(read.getRevisionHistory(db, { traitId: trait.id })[0]?.traceIds, [t.id]);
	write.refineWithEvidence(db, {
		soulId,
		action: 'revise',
		traitId: trait.id,
		principle: 'Check evidence before edits',
		provenance: 'Review',
		shardIds: [s.id],
		now: NOW,
	});
	deepStrictEqual(read.getRevisionHistory(db, { traitId: trait.id })[0]?.traceIds, [t.id]);
	const wrapped: SoulsDb = {
		exec: (sql) => db.exec(sql),
		close: () => {},
		prepare: (sql) => {
			if (sql.includes('pow(')) throw new Error('no such function: pow');
			return db.prepare(sql);
		},
	};
	deepStrictEqual(
		read.traceStats(wrapped, { now: NOW + 30 * DAY }).weights,
		read.traceStats(db, { now: NOW + 30 * DAY }).weights,
	);
});
