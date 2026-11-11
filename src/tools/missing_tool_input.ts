import { type ToolNeedsClarification, toolNeedsClarification } from './tool_types.ts';

/** Keep the action-specific summary distinct from the recovery question. */
export function missingToolInput(
	summary: string,
	question: string,
	missing: string[],
): ToolNeedsClarification {
	const result = toolNeedsClarification('missing_required_choice', question, missing);
	result.summary = summary;
	return result;
}
