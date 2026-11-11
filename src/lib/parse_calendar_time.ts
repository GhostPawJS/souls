import { SoulsValidationError } from '../errors.ts';

// Ported from Affinity's calendar parser; kept local so the packages remain independent.
const timeInputForms =
	'epoch milliseconds integer (>= 1e12), ISO datetime with Z/offset or local ISO datetime (tz, TZ, then host zone), YYYY-MM-DD, DD.MM.YYYY, today, tomorrow, yesterday, +Nd/-Nd or +Nh/-Nh';
export function localCalendarDate(now: number, tz?: string): string {
	const zone = tz ?? process.env.TZ;
	if (zone !== undefined) new Intl.DateTimeFormat('en', { timeZone: zone }).format(now);
	if (zone)
		return new Intl.DateTimeFormat('en-CA', {
			timeZone: zone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).format(now);
	const d = new Date(now);
	return `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseCalendarTime(
	value: number | string,
	field = 'time',
	now = Date.now(),
	tz?: string,
): { timestamp: number; day: string } {
	const zone = tz ?? process.env.TZ;
	try {
		localCalendarDate(now, zone);
	} catch {
		throw new SoulsValidationError(
			`${field}: invalid time zone; expected IANA tz and ${timeInputForms}`,
		);
	}
	if (value == null && field.endsWith('occurredAt'))
		throw new SoulsValidationError(
			'occurredAt is required (ISO, YYYY-MM-DD, epoch ms, today, +3d …)',
		);
	const fail = (): never => {
		throw new SoulsValidationError(`${field}: expected timestamp: ${timeInputForms}`);
	};
	if (typeof value === 'number' || (typeof value === 'string' && /^-?\d+$/.test(value.trim()))) {
		const timestamp = Number(value);
		if (timestamp < 1e12)
			throw new SoulsValidationError(
				`${field}: epoch milliseconds (>= 1e12) expected, not seconds; accepted forms: ${timeInputForms}.`,
			);
		if (!Number.isSafeInteger(timestamp) || !Number.isFinite(new Date(timestamp).getTime()))
			return fail();
		return {
			timestamp,
			day:
				zone && field.split('.').at(-1) === 'dueAt'
					? localCalendarDate(timestamp, zone)
					: new Date(timestamp).toISOString().slice(0, 10),
		};
	}
	if (typeof value !== 'string') return fail();
	let text = value.trim();
	if (/^[+-]\d+h$/.test(text)) {
		const timestamp = now + Number(text.slice(0, -1)) * 3600000;
		if (!Number.isSafeInteger(timestamp) || !Number.isFinite(new Date(timestamp).getTime()))
			return fail();
		return { timestamp, day: localCalendarDate(timestamp, zone) };
	}
	if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(text)) {
		text = text.replace(' ', 'T');
		if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(text)) text += 'Z';
	}
	text = text.replace(
		/\.(\d{4,})(?=Z|[+-]\d{2}:\d{2}$)/,
		(_, digits: string) => `.${digits.slice(0, 3)}`,
	);
	if (/^(today|yesterday|tomorrow|[+-]\d+d)$/.test(text)) {
		const offset =
			text === 'today'
				? 0
				: text === 'tomorrow'
					? 1
					: text === 'yesterday'
						? -1
						: Number(text.slice(0, -1));
		const date = new Date(`${localCalendarDate(now, zone)}T00:00:00Z`);
		date.setUTCDate(date.getUTCDate() + offset);
		if (!Number.isFinite(date.getTime())) return fail();
		text = date.toISOString().slice(0, 10);
	}
	const european = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
	if (european) text = `${european[3]}-${european[2]}-${european[1]}`;
	if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(text)) {
		const target = Date.parse(`${text}Z`);
		if (
			!Number.isFinite(target) ||
			new Date(target).toISOString().slice(0, 10) !== text.slice(0, 10) ||
			Number(text.slice(11, 13)) > 23 ||
			Number(text.slice(14, 16)) > 59 ||
			Number(text.slice(17, 19) || 0) > 59
		)
			return fail();
		const formatter = new Intl.DateTimeFormat('en-CA', {
			timeZone: zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hourCycle: 'h23',
		});
		let timestamp = target;
		for (let i = 0; i < 4; i++) {
			const parts = Object.fromEntries(
				formatter.formatToParts(timestamp).map((p) => [p.type, p.value]),
			);
			const local =
				Date.parse(
					`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
				) + (target % 1000);
			const correction = target - local;
			if (!correction) break;
			timestamp += correction;
		}
		return { timestamp, day: localCalendarDate(timestamp, zone) };
	}
	const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
	if (
		!dateOnly &&
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(text)
	)
		return fail();
	const day = text.slice(0, 10);
	const midnight = Date.parse(`${day}T00:00:00Z`);
	if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== day)
		return fail();
	const timestamp = dateOnly
		? midnight + (field.split('.').at(-1) === 'dueAt' ? 86399999 : 0)
		: Date.parse(text);
	if (!Number.isFinite(timestamp)) return fail();
	return {
		timestamp,
		day:
			zone && !dateOnly && field.split('.').at(-1) === 'dueAt'
				? localCalendarDate(timestamp, zone)
				: day,
	};
}
