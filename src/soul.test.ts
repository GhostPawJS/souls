import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	renderSoulsSoulPromptFoundation,
	soulsSoul,
	soulsSoulEssence,
	soulsSoulTraits,
} from './soul.ts';

describe('soul.ts', () => {
	it('soulsSoul has the expected shape', () => {
		strictEqual(soulsSoul.slug, 'mentor');
		ok(soulsSoul.name.length > 0);
		ok(soulsSoul.description.length > 0);
		ok(soulsSoul.essence.length > 0);
		ok(soulsSoul.traits.length >= 2);
	});

	it('soulsSoulEssence is the same string on soulsSoul', () => {
		strictEqual(soulsSoul.essence, soulsSoulEssence);
	});

	it('soulsSoulTraits are the same array on soulsSoul', () => {
		strictEqual(soulsSoul.traits, soulsSoulTraits);
	});

	it('every trait has non-empty principle and provenance', () => {
		for (const trait of soulsSoulTraits) {
			ok(trait.principle.length > 0);
			ok(trait.provenance.length > 0);
		}
	});

	it('renderSoulsSoulPromptFoundation returns a non-empty string with name and essence', () => {
		const rendered = renderSoulsSoulPromptFoundation();
		ok(rendered.includes(soulsSoul.name));
		ok(rendered.includes('Essence:'));
		ok(rendered.includes('Traits:'));
	});

	it('renderSoulsSoulPromptFoundation accepts a custom soul', () => {
		const custom = {
			slug: 'test',
			name: 'Test Soul',
			description: 'desc',
			essence: 'test essence',
			traits: [{ principle: 'P', provenance: 'E' }],
		};
		const rendered = renderSoulsSoulPromptFoundation(custom);
		ok(rendered.includes('Test Soul'));
		ok(rendered.includes('test essence'));
	});
});
