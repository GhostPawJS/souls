export function normalizeShardContent(raw: string): string {
	return raw.trim().replace(/\s+/g, ' ');
}
