import { parseCalendarTime } from '../lib/parse_calendar_time.ts';
import type { TraceOptions, TraceTime } from './types.ts';
export function time(value: TraceTime, field: string, options: TraceOptions = {}): number {
	return parseCalendarTime(
		value,
		field,
		typeof options.now === 'number' ? options.now : Date.now(),
		options.tz,
	).timestamp;
}
