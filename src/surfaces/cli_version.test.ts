import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cliVersion, markPackageCli } from './cli_version.ts';

test('version identifies binary targets ahead of the package entry', () => {
	for (const [platform, arch, target] of [
		['linux', 'x64', 'linux-x64'],
		['linux', 'arm64', 'linux-arm64'],
		['darwin', 'arm64', 'darwin-arm64'],
		['darwin', 'x64', 'darwin-x64'],
		['win32', 'x64', 'windows-x64'],
	] as const) {
		assert.equal(
			cliVersion('1.2.3', { sea: () => true, npm: true, platform, arch }),
			`souls 1.2.3 (binary, ${target})`,
		);
	}
});

test('version identifies library and package entry, including detection errors', () => {
	assert.equal(cliVersion('1.2.3', { sea: () => false, npm: false }), 'souls 1.2.3 (library)');
	assert.equal(cliVersion('1.2.3', { sea: () => false, npm: true }), 'souls 1.2.3 (npm)');
	assert.equal(
		cliVersion('1.2.3', {
			sea: () => {
				throw new Error('unavailable');
			},
			npm: false,
		}),
		'souls 1.2.3 (library)',
	);
	markPackageCli();
	assert.equal(cliVersion('1.2.3', { sea: () => false }), 'souls 1.2.3 (npm)');
});
