import { isSea } from 'node:sea';

let packageEntry = false;

export function markPackageCli(): void {
	packageEntry = true;
}

export function cliVersion(
	version: string,
	{
		sea = isSea,
		npm = packageEntry,
		platform = process.platform,
		arch = process.arch,
		format,
	}: {
		sea?: () => boolean;
		npm?: boolean;
		platform?: string;
		arch?: string;
		format?: 'short' | 'json' | undefined;
	} = {},
): string {
	let binary = false;
	try {
		binary = sea();
	} catch {
		binary = false;
	}
	const target = `${platform === 'win32' ? 'windows' : platform}-${arch}`;
	const variant = binary ? 'binary' : npm ? 'npm' : 'library';
	if (format === 'json') return JSON.stringify({ name: 'souls', version, variant, target });
	if (format === 'short') return version;
	return `souls ${version} (${binary ? `binary, ${target}` : npm ? 'npm' : 'library'})`;
}
