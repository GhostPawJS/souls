import type { SoulsDb } from '../database.ts';
import { createMcpServer } from '../surfaces/mcp_server.ts';
import { serveMcpStdio } from '../surfaces/mcp_stdio.ts';
import { openSoulsDb } from './open_souls_db.ts';
import { resolveSoulsDbPath } from './resolve_souls_db_path.ts';
import { soulsMcpOptions } from './souls_mcp_options.ts';

export async function serveSoulsMcp(
	options: { db?: SoulsDb; dbPath?: string } = {},
): Promise<void> {
	let owned: SoulsDb | undefined;
	const server = createMcpServer(
		soulsMcpOptions(async () => {
			if (options.db) return options.db;
			owned = await openSoulsDb(
				resolveSoulsDbPath(options.dbPath === undefined ? {} : { flag: options.dbPath }),
			);
			return owned;
		}),
	);
	try {
		await serveMcpStdio(server);
	} finally {
		owned?.close();
	}
}
