import { SoulsNotFoundError } from '../errors.ts';
import type { Trace } from './types.ts';
export function requireTrace(trace: Trace | null, id: number): Trace {
	if (!trace) throw new SoulsNotFoundError(`Trace #${id} not found`);
	return trace;
}
