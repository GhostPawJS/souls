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

test('machine versions identify each variant and normalize Windows targets', () => {
	for (const [sea, npm, variant] of [
		[true, true, 'binary'],
		[false, true, 'npm'],
		[false, false, 'library'],
	] as const) {
		const options = { sea: () => sea, npm, platform: 'win32', arch: 'x64' };
		assert.equal(cliVersion('1.2.3', { ...options, format: 'short' }), '1.2.3');
		assert.deepEqual(JSON.parse(cliVersion('1.2.3', { ...options, format: 'json' })), {
			name: 'souls',
			version: '1.2.3',
			variant,
			target: 'windows-x64',
		});
	}
});
