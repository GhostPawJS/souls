import { time } from './trace_time.ts';
import type { TraceOptions } from './types.ts';
export function clock(options: TraceOptions = {}): number {
	return options.now === undefined ? Date.now() : time(options.now, 'now', { tz: options.tz });
}
