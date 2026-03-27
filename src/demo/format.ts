const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

export function relativeAge(timestampMs: number, now = Date.now()): string {
	const diff = now - timestampMs;
	if (diff < MS_PER_MINUTE) return 'just now';
	if (diff < MS_PER_HOUR) {
		const m = Math.floor(diff / MS_PER_MINUTE);
		return `${m}m ago`;
	}
	if (diff < MS_PER_DAY) {
		const h = Math.floor(diff / MS_PER_HOUR);
		return `${h}h ago`;
	}
	const d = Math.floor(diff / MS_PER_DAY);
	if (d === 1) return '1 day ago';
	if (d < 30) return `${d} days ago`;
	const mo = Math.floor(d / 30);
	return mo === 1 ? '1 month ago' : `${mo} months ago`;
}

export function pct(value: number, total: number): number {
	if (total <= 0) return 0;
	return Math.round((value / total) * 100);
}

export function pctStr(value: number, total: number): string {
	return `${pct(value, total)}%`;
}

export function healthColor(health: number): string {
	if (health >= 0.6) return 'var(--success)';
	if (health >= 0.3) return 'var(--warn)';
	return 'var(--danger)';
}

export function plural(n: number, singular: string, pluralForm?: string): string {
	return n === 1 ? `1 ${singular}` : `${n} ${pluralForm ?? `${singular}s`}`;
}
