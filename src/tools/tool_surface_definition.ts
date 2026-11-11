import type { SoulsToolDefinition } from './tool_metadata.ts';

/** Transport metadata excludes the additional library discovery annotations. */
export type ToolSurfaceDefinition<TInput, TOutput> = Omit<
	SoulsToolDefinition<TInput, TOutput>,
	'supportsClarification' | 'targetKinds' | 'inputDescriptions' | 'outputDescription'
>;
