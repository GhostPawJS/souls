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
	}: {
		sea?: () => boolean;
		npm?: boolean;
		platform?: string;
		arch?: string;
	} = {},
): string {
	let binary = false;
	try {
		binary = sea();
	} catch {
		binary = false;
	}
	const target = `${platform === 'win32' ? 'windows' : platform}-${arch}`;
	return `souls ${version} (${binary ? `binary, ${target}` : npm ? 'npm' : 'library'})`;
}
