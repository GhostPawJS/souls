import { schemaExample } from '../surfaces/schema_example.ts';
import { validateInput } from '../surfaces/validate_input.ts';
import type { JsonSchema } from './tool_metadata.ts';
import { toolFailure } from './tool_types.ts';

export function validateToolInput(tool: { name: string; inputSchema: JsonSchema }, input: unknown) {
	const errors = validateInput(tool.inputSchema, input);
	if (!errors.length) return null;
	const action = (input as Record<string, unknown> | null)?.action;
	const example = schemaExample(
		tool.inputSchema,
		tool.name,
		typeof action === 'string' ? action : undefined,
	);
	const message = errors.join('; ');
	const result = toolFailure('protocol', 'invalid_input', message, message);
	result.error.recovery = `${message}; pass ${JSON.stringify(example)}`;
	return result;
}
