import { ok, strictEqual, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SoulsValidationError } from '../errors.ts';
import { createInitializedSoulsDb } from '../lib/test-db.ts';
import { dropShard } from '../shards/drop_shard.ts';
import { formatEvidence } from '../shards/format_evidence.ts';
import { createSoul } from '../souls/create_soul.ts';
import { stampAttuned } from '../souls/stamp_attuned.ts';
import { addTrait } from '../traits/add_trait.ts';
import { listTraits } from '../traits/list_traits.ts';
import { revertTrait } from '../traits/revert_trait.ts';
import { reviseTrait } from '../traits/revise_trait.ts';
import { produceTraitProposalsFromEvidenceSkill } from './produce-trait-proposals-from-evidence.ts';

describe('produce-trait-proposals-from-evidence workflow', () => {
	it('skill definition has valid shape and content', () => {
		strictEqual(
			produceTraitProposalsFromEvidenceSkill.name,
			'produce-trait-proposals-from-evidence',
		);
		ok(
			produceTraitProposalsFromEvidenceSkill.content.includes(
				'# Produce Trait Proposals from Evidence',
			),
		);
		ok(produceTraitProposalsFromEvidenceSkill.content.includes('inspect_souls_item'));
		ok(produceTraitProposalsFromEvidenceSkill.content.includes('refine_soul'));
		ok(produceTraitProposalsFromEvidenceSkill.content.includes('novel'));
		ok(produceTraitProposalsFromEvidenceSkill.content.includes('stale'));
		ok(produceTraitProposalsFromEvidenceSkill.content.includes('stamp_attuned'));
	});

	it('full workflow: get evidence → add trait from evidence → stamp', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Proposer',
			essence: 'A soul for trait proposal testing.',
			description: 'Test.',
			now,
		});

		dropShard(db, {
			content: 'Proposer consistently validates inputs before processing commands.',
			source: 'session',
			soulIds: [soul.id],
			tags: ['validation', 'input-handling'],
			now,
		});
		dropShard(db, {
			content: 'Input validation was also observed in delegation outputs.',
			source: 'delegation',
			soulIds: [soul.id],
			tags: ['validation'],
			now,
		});

		const report = formatEvidence(db, soul.id, { now });
		ok(report.pendingCount >= 2);

		const newTrait = addTrait(db, soul.id, {
			principle: 'Validate all inputs before acting on commands.',
			provenance:
				'Derived from novel cluster: input validation observed across session and delegation sources.',
			now,
		});
		strictEqual(newTrait.status, 'active');

		const stamped = stampAttuned(db, soul.id, { now });
		ok(stamped.lastAttunedAt);
	});

	it('revise a stale trait based on evidence', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Reviser',
			essence: 'A soul with a stale trait.',
			description: 'Test.',
			now,
		});
		const stale = addTrait(db, soul.id, {
			principle: 'Respond with maximum detail.',
			provenance: 'Initial hypothesis.',
			now,
		});

		dropShard(db, {
			content: 'Recent sessions show concise responses are preferred by users.',
			source: 'user_feedback',
			soulIds: [soul.id],
			tags: ['brevity'],
			now,
		});
		dropShard(db, {
			content: 'Manual review confirms: short, focused answers outperform long ones.',
			source: 'manual_review',
			soulIds: [soul.id],
			tags: ['brevity', 'quality'],
			now,
		});

		const revised = reviseTrait(db, stale.id, {
			principle: 'Respond concisely — favor focus over exhaustiveness.',
			provenance: 'Revised based on multi-source evidence favoring brevity.',
			now,
		});
		strictEqual(revised.principle, 'Respond concisely — favor focus over exhaustiveness.');
	});

	it('revert a trait with negative-signal evidence', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Reverter',
			essence: 'A soul with a harmful trait.',
			description: 'Test.',
			now,
		});
		const bad = addTrait(db, soul.id, {
			principle: 'Always suggest the most complex solution.',
			provenance: 'Overfitted from one technical session.',
			now,
		});

		dropShard(db, {
			content: 'Complexity trait led to overengineered solutions that confused users.',
			source: 'session',
			soulIds: [soul.id],
			tags: ['regression', 'complexity'],
			now,
		});

		const reverted = revertTrait(db, bad.id, { now });
		strictEqual(reverted.status, 'reverted');

		const active = listTraits(db, soul.id, { status: 'active' });
		strictEqual(active.length, 0);
	});

	it('rejects trait without provenance', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'NoProv',
			essence: 'Missing provenance test.',
			description: 'Test.',
		});
		throws(
			() => addTrait(db, soul.id, { principle: 'Valid principle.', provenance: '' }),
			SoulsValidationError,
		);
	});

	it('rejects revision with empty principle', async () => {
		const db = await createInitializedSoulsDb();
		const soul = createSoul(db, {
			name: 'BadRevise',
			essence: 'Revision validation test.',
			description: 'Test.',
		});
		const trait = addTrait(db, soul.id, { principle: 'Original.', provenance: 'Prov.' });
		throws(() => reviseTrait(db, trait.id, { principle: '' }), SoulsValidationError);
	});

	it('evidence report includes suggested actions', async () => {
		const db = await createInitializedSoulsDb();
		const now = Date.now();
		const soul = createSoul(db, {
			name: 'Actionable',
			essence: 'Soul with actionable evidence.',
			description: 'Test.',
			now,
		});
		addTrait(db, soul.id, { principle: 'Be helpful.', provenance: 'Original.', now });

		dropShard(db, {
			content: 'Strong evidence pattern emerged in error recovery behavior.',
			source: 'session',
			soulIds: [soul.id],
			tags: ['error-recovery'],
			now,
		});
		dropShard(db, {
			content: 'Error recovery pattern confirmed across delegation.',
			source: 'delegation',
			soulIds: [soul.id],
			tags: ['error-recovery'],
			now,
		});

		const report = formatEvidence(db, soul.id, { now });
		ok(Array.isArray(report.suggestedActions));
		ok(report.renderedMarkdown.length > 0);
	});
});
