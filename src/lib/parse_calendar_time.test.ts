import { strictEqual, throws } from 'node:assert';
import { it } from 'node:test';
import { SoulsValidationError } from '../errors.ts';
import { parseCalendarTime } from './parse_calendar_time.ts';

const NOW = Date.UTC(2026, 10, 10, 23);
it('parses epoch, explicit zones, European dates, relative hours and zoned calendar words', () => {
	strictEqual(parseCalendarTime(NOW).timestamp, NOW);
	strictEqual(parseCalendarTime('2026-11-10T12:00:00+02:00').timestamp, Date.UTC(2026, 10, 10, 10));
	strictEqual(
		parseCalendarTime('12.11.2026', 'dueAt').timestamp,
		Date.UTC(2026, 10, 12, 23, 59, 59, 999),
	);
	strictEqual(
		parseCalendarTime('today', 'createdAt', NOW, 'Asia/Tokyo').timestamp,
		Date.UTC(2026, 10, 11),
	);
	strictEqual(parseCalendarTime('+2h', 'at', NOW).timestamp, NOW + 7200000);
	strictEqual(parseCalendarTime('-2d', 'at', NOW, 'UTC').timestamp, Date.UTC(2026, 10, 8));
});
it('rejects seconds and invalid calendar dates; resolves unzoned ISO locally', () => {
	for (const value of [1234567890, '2026-02-30', '2026-11-12T12:00:00', 'nonsense']) {
		if (value === '2026-11-12T12:00:00') {
			strictEqual(
				parseCalendarTime(value, 'dueAt', NOW, 'UTC').timestamp,
				Date.UTC(2026, 10, 12, 12),
			);
			continue;
		}
		throws(
			() => parseCalendarTime(value, 'dueAt'),
			(e) => e instanceof SoulsValidationError && e.message.includes('dueAt'),
		);
	}
});
