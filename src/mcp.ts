import type { SoulsDb } from './database.ts';
import { openSoulsDb } from './surface/open_souls_db.ts';
import { resolveSoulsDbPath } from './surface/resolve_souls_db_path.ts';
import { soulsMcpOptions } from './surface/souls_mcp_options.ts';
import { createMcpServer } from './surfaces/mcp_server.ts';

export { serveSoulsMcp } from './surface/serve_souls_mcp.ts';
export { soulsMcpInstructions } from './surface/souls_mcp_instructions.ts';
export type { McpServerOptions } from './surfaces/mcp_server.ts';
export {
	createMcpServer,
	MCP_LATEST_PROTOCOL_VERSION,
	MCP_SUPPORTED_PROTOCOL_VERSIONS,
} from './surfaces/mcp_server.ts';
export { serveMcpStdio } from './surfaces/mcp_stdio.ts';
export type * from './surfaces/surface_types.ts';

export function createSoulsMcpServer(options: { db?: SoulsDb; dbPath?: string } = {}) {
	return createMcpServer(
		soulsMcpOptions(
			() =>
				options.db ??
				openSoulsDb(
					resolveSoulsDbPath(options.dbPath === undefined ? {} : { flag: options.dbPath }),
				),
		),
	);
}
