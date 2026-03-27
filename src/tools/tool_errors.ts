import { isSoulsError } from '../errors.ts';
import { reviewSoulsToolName, searchSoulsToolName } from './tool_names.ts';
import { inspectSoulsItemNext, useToolNext } from './tool_next.ts';
import type { ToolErrorCode, ToolErrorKind, ToolFailure, ToolNextStepHint } from './tool_types.ts';
import { toolFailure } from './tool_types.ts';

interface TranslateErrorOptions {
	summary?: string | undefined;
	next?: ToolNextStepHint[] | undefined;
}

function mapSoulsErrorCode(name: string): { kind: ToolErrorKind; toolCode: ToolErrorCode } {
	if (name === 'SoulsNotFoundError') return { kind: 'domain', toolCode: 'not_found' };
	if (name === 'SoulsValidationError') return { kind: 'protocol', toolCode: 'invalid_input' };
	if (name === 'SoulsStateError') return { kind: 'domain', toolCode: 'invalid_state' };
	return { kind: 'system', toolCode: 'system_error' };
}

export function translateToolError(
	error: unknown,
	options: TranslateErrorOptions = {},
): ToolFailure {
	if (isSoulsError(error)) {
		const { kind, toolCode } = mapSoulsErrorCode(error.name);
		const next = options.next ?? [];
		if (error.name === 'SoulsNotFoundError') {
			next.push(
				useToolNext(searchSoulsToolName, 'Search shards to find relevant data.'),
				useToolNext(reviewSoulsToolName, 'List all souls to find the correct ID.'),
			);
		}
		const result = toolFailure(kind, toolCode, options.summary ?? error.message, error.message, {
			next: next.length > 0 ? next : undefined,
		});
		if (error.name === 'SoulsNotFoundError') {
			result.error.recovery = 'Use search_souls or review_souls to find the correct ID.';
		}
		return result;
	}
	const message = error instanceof Error ? error.message : String(error);
	return toolFailure(
		'system',
		'system_error',
		options.summary ?? 'An unexpected error occurred.',
		message,
	);
}

export function soulNotFoundHints(soulId: number): ToolNextStepHint[] {
	return [
		useToolNext(reviewSoulsToolName, `List souls to find the correct ID instead of ${soulId}.`),
	];
}

export function soulEntityHint(soulId: number, name?: string): ToolNextStepHint {
	return inspectSoulsItemNext(soulId, name);
}
