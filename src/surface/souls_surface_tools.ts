import type { SoulsDb } from '../database.ts';
import type { SurfaceTool } from '../surfaces/surface_types.ts';
import { soulsTools } from '../tools/tool_registry.ts';

export const soulsSurfaceTools: readonly SurfaceTool<SoulsDb>[] = soulsTools.map((tool) => ({
	name: tool.name,
	description: tool.description,
	whenToUse: tool.whenToUse,
	whenNotToUse: tool.whenNotToUse,
	readOnly: tool.readOnly,
	sideEffects: tool.sideEffects,
	inputSchema: { ...tool.inputSchema, type: 'object' },
	handler: tool.handler as SurfaceTool<SoulsDb>['handler'],
}));
