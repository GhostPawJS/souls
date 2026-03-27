import { inspectSoulsItemTool } from './inspect_souls_item_tool.ts';
import { levelUpSoulTool } from './level_up_soul_tool.ts';
import { manageSoulTool } from './manage_soul_tool.ts';
import { observeSoulTool } from './observe_soul_tool.ts';
import { refineSoulTool } from './refine_soul_tool.ts';
import { reviewSoulsTool } from './review_souls_tool.ts';
import { searchSoulsTool } from './search_souls_tool.ts';
import type { SoulsToolDefinition, ToolDefinitionRegistry } from './tool_metadata.ts';

export const soulsTools = [
	searchSoulsTool,
	reviewSoulsTool,
	inspectSoulsItemTool,
	observeSoulTool,
	refineSoulTool,
	levelUpSoulTool,
	manageSoulTool,
] satisfies ToolDefinitionRegistry;

// biome-ignore lint/suspicious/noExplicitAny: registry contains heterogeneous tool definitions
export function getSoulsToolByName(name: string): SoulsToolDefinition<any, any> | null {
	return soulsTools.find((tool) => tool.name === name) ?? null;
}

export function listSoulsToolDefinitions() {
	return [...soulsTools];
}
