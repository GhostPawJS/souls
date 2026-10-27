import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Writable } from 'node:stream';
import { test } from 'node:test';
import { soulsSkills } from '../skills/skill_registry.ts';
import { runToolCli } from '../surfaces/cli.ts';
import { renderSkillMarkdown } from '../surfaces/skill_markdown.ts';
import { validateInput } from '../surfaces/validate_input.ts';
import { soulsCliOptions } from './souls_cli_options.ts';
import { soulsSkillSpec } from './souls_skill_spec.ts';

test('guides are served verbatim without opening a database', async () => {
	let output = '';
	const stdout = new Writable({
		write(chunk, _encoding, done) {
			output += chunk;
			done();
		},
	});
	const options = {
		...soulsCliOptions,
		stdout,
		stderr: stdout,
		openContext() {
			throw new Error('No database needed');
		},
	};
	for (const guide of soulsSkills) {
		output = '';
		assert.equal(await runToolCli(['skill', guide.name], options), 0);
		assert.equal(output, readFileSync(`skills/souls/references/${guide.name}.md`, 'utf8'));
	}
	output = '';
	assert.equal(await runToolCli(['skill', '--list'], options), 0);
	assert.equal(output.split('\n').filter(Boolean).length, soulsSkills.length);
	output = '';
	assert.equal(await runToolCli(['skill', '--help'], options), 0);
	assert.match(output, /skill <guide>/);
	output = '';
	assert.equal(await runToolCli(['skill', 'missing'], options), 1);
	assert.match(output, /unknown guide missing; run ghostpaw-souls skill --list/);
});

test('every rendered example validates against its tool schema', () => {
	const markdown = renderSkillMarkdown(soulsSkillSpec);
	const examples = [...markdown.matchAll(/^ghostpaw-souls call (\w+) '(.+)'$/gm)];
	for (const tool of soulsSkillSpec.tools) {
		assert.ok(
			examples.some((match) => match[1] === tool.name),
			tool.name,
		);
	}
	for (const [, name, json] of examples) {
		const tool = soulsSkillSpec.tools.find((tool) => tool.name === name);
		assert.ok(tool);
		assert.deepEqual(validateInput(tool.inputSchema, JSON.parse(json ?? '')), [], name);
	}
	assert.match(markdown, /\| plan.newEssence \| string \| yes \|/);
	assert.match(markdown, /ghostpaw-souls skill observe-behavior-well/);
});
