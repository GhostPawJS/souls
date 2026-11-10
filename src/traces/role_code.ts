import { SoulsValidationError } from '../errors.ts';
import { roles } from './trace_roles.ts';
import type { TraceRole } from './types.ts';
export function roleCode(role: TraceRole | number): number {
	const code = typeof role === 'number' ? role : roles.indexOf(role);
	if (![0, 1, 2].includes(code))
		throw new SoulsValidationError('role must be owner|counterpart|subject or 0|1|2');
	return code;
}
