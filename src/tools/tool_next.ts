import {
	inspectSoulsItemToolName,
	observeSoulToolName,
	refineSoulToolName,
	reviewSoulsToolName,
	searchSoulsToolName,
} from './tool_names.ts';
import type { ToolNextStepHint } from './tool_types.ts';

export function searchSoulsNext(query?: string, soulId?: number): ToolNextStepHint {
	const suggestedInput: Record<string, unknown> = {};
	if (query) suggestedInput.query = query;
	if (soulId !== undefined) suggestedInput.soulId = soulId;
	return {
		kind: 'use_tool',
		message: query ? `Search shards for "${query}".` : 'Browse pending shards.',
		tool: searchSoulsToolName,
		suggestedInput: Object.keys(suggestedInput).length > 0 ? suggestedInput : undefined,
	};
}

export function inspectSoulsItemNext(soulId: number, name?: string): ToolNextStepHint {
	return {
		kind: 'inspect_item',
		message: name ? `Inspect soul "${name}".` : `Inspect soul ${soulId}.`,
		tool: inspectSoulsItemToolName,
		suggestedInput: { soulId },
	};
}

export function reviewSoulsNext(message: string): ToolNextStepHint {
	return {
		kind: 'review_view',
		message,
		tool: reviewSoulsToolName,
	};
}

export function observeSoulNext(soulId: number, message: string): ToolNextStepHint {
	return {
		kind: 'use_tool',
		message,
		tool: observeSoulToolName,
		suggestedInput: { soulId },
	};
}

export function refineSoulNext(action: string, soulId: number, message: string): ToolNextStepHint {
	return {
		kind: 'use_tool',
		message,
		tool: refineSoulToolName,
		suggestedInput: { action, soulId },
	};
}

export function retryNext(
	message: string,
	suggestedInput?: Record<string, unknown>,
): ToolNextStepHint {
	return { kind: 'retry_with', message, suggestedInput };
}

export function useToolNext(
	tool: string,
	message: string,
	suggestedInput?: Record<string, unknown>,
): ToolNextStepHint {
	return { kind: 'use_tool', message, tool, suggestedInput };
}
