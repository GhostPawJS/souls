import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { defineSoulsSkill } from './skill_types.ts';

describe('defineSoulsSkill', () => {
	it('returns the same skill object', () => {
		const skill = defineSoulsSkill({
			name: 'test-skill',
			description: 'desc',
			content: '# Test Skill\n\nDo this thing.',
		});
		strictEqual(skill.name, 'test-skill');
		ok(skill.content.length > 0);
	});
});
