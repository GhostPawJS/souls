import { parseCalendarTime, zonedTimestamp } from '../lib/parse_calendar_time.ts';
import type { TraceOptions, TraceTime } from './types.ts';
export function time(value: TraceTime, field: string, options: TraceOptions = {}): number {
	if (value === 'now')
		return options.now === undefined || options.now === 'now'
			? Date.now()
			: time(options.now, 'now', { tz: options.tz });
	const parsed = parseCalendarTime(
		value,
		field,
		typeof options.now === 'number' ? options.now : Date.now(),
		options.tz,
	);
	if (
		typeof value !== 'string' ||
		!/^(\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4}|today|tomorrow|yesterday|[+-]\d+d)$/.test(
			value.trim(),
		)
	)
		return parsed.timestamp;
	const zone = options.tz ?? process.env.TZ ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
	// A bare day used as a due date means the end of that local day, as in 0.6.0 for UTC.
	if (/(^|\.)(dueAt|nextDue)$/.test(field)) {
		const next = new Date(Date.parse(`${parsed.day}T00:00:00Z`) + 86400000)
			.toISOString()
			.slice(0, 10);
		return localMidnight(next, zone) - 1;
	}
	return localMidnight(parsed.day, zone);
}
function localMidnight(day: string, zone: string): number {
	return zonedTimestamp(Date.parse(`${day}T00:00:00Z`), zone);
}
