export function resolveNow(now?: number): number {
	return now ?? Date.now();
}
