import type { SoulsDb } from '../database.ts';
import type { McpServerOptions } from '../surfaces/mcp_server.ts';
import { soulsVersion } from '../version.ts';
import { soulsMcpInstructions } from './souls_mcp_instructions.ts';
import { soulsMcpSurfaceTools } from './souls_surface_tools.ts';

export function soulsMcpOptions(
	context: () => SoulsDb | Promise<SoulsDb>,
): McpServerOptions<SoulsDb> {
	return {
		name: 'ghostpaw-souls',
		version: soulsVersion,
		title: 'Souls',
		instructions: soulsMcpInstructions,
		tools: soulsMcpSurfaceTools,
		context,
		annotations: ({ readOnly = false, name }) => ({
			readOnlyHint: readOnly,
			destructiveHint: /^(manage|refine|level_up)_soul$/.test(name),
			idempotentHint: readOnly,
			openWorldHint: false,
		}),
	};
}
