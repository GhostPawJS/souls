import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as levels from './index.ts';

describe('levels barrel', () => {
	it('exports levelUp', () => {
		strictEqual(typeof levels.levelUp, 'function');
	});

	it('exports revertLevelUp', () => {
		strictEqual(typeof levels.revertLevelUp, 'function');
	});

	it('exports getLevelHistory', () => {
		strictEqual(typeof levels.getLevelHistory, 'function');
	});

	it('exports validateLevelUpPlan', () => {
		strictEqual(typeof levels.validateLevelUpPlan, 'function');
	});
});
