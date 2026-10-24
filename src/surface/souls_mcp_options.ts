import type { SoulsDb } from '../database.ts';
import type { McpServerOptions } from '../surfaces/mcp_server.ts';
import { soulsVersion } from '../version.ts';
import { soulsMcpInstructions } from './souls_mcp_instructions.ts';
import { soulsSurfaceTools } from './souls_surface_tools.ts';

export function soulsMcpOptions(
	context: () => SoulsDb | Promise<SoulsDb>,
): McpServerOptions<SoulsDb> {
	return {
		name: 'ghostpaw-souls',
		version: soulsVersion,
		title: 'Souls',
		instructions: soulsMcpInstructions,
		tools: soulsSurfaceTools,
		context,
		annotations: (tool) => ({
			readOnlyHint: tool.readOnly ?? false,
			destructiveHint: ['manage_soul', 'refine_soul', 'level_up_soul'].includes(tool.name),
			idempotentHint: tool.readOnly ?? false,
			openWorldHint: false,
		}),
	};
}
