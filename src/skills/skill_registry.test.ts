import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getSoulsSkillByName, listSoulsSkills, soulsSkills } from './skill_registry.ts';

describe('skill_registry', () => {
	it('soulsSkills contains all 9 skills', () => {
		strictEqual(soulsSkills.length, 9);
	});

	it('each skill has a unique name', () => {
		const names = new Set(soulsSkills.map((s) => s.name));
		strictEqual(names.size, 9);
	});

	it('all expected skill names are present', () => {
		const names = new Set(soulsSkills.map((s) => s.name));
		ok(names.has('observe-behavior-well'));
		ok(names.has('run-maintenance-pass'));
		ok(names.has('produce-trait-proposals-from-evidence'));
		ok(names.has('judge-consolidation-versus-promotion'));
		ok(names.has('execute-level-up-plan'));
		ok(names.has('bootstrap-new-soul'));
		ok(names.has('detect-and-fix-regression'));
		ok(names.has('review-soul-health'));
		ok(names.has('record-and-settle-traces'));
	});

	it('getSoulsSkillByName returns skill for known name', () => {
		const skill = getSoulsSkillByName('observe-behavior-well');
		ok(skill !== null);
		strictEqual(skill?.name, 'observe-behavior-well');
	});

	it('getSoulsSkillByName returns null for unknown name', () => {
		strictEqual(getSoulsSkillByName('no_such_skill'), null);
	});

	it('listSoulsSkills returns all 9 skills', () => {
		strictEqual(listSoulsSkills().length, 9);
	});

	it('every skill has non-empty content', () => {
		for (const skill of soulsSkills) {
			ok(skill.content.length > 0, `Skill "${skill.name}" has empty content`);
		}
	});

	it('every skill has a description', () => {
		for (const skill of soulsSkills) {
			ok(skill.description.length > 0, `Skill "${skill.name}" has no description`);
		}
	});
});
