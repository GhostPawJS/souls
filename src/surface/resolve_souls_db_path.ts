import { homedir } from 'node:os';
import { join } from 'node:path';

export function resolveSoulsDbPath(
	options: { flag?: string; env?: Record<string, string | undefined> } = {},
): string {
	return (
		options.flag ??
		((options.env ?? process.env).GHOSTPAW_SOULS_DB || join(homedir(), '.ghostpaw', 'souls.db'))
	);
}
