export function normalizeTag(tag: string): string {
	return tag.toLowerCase().trim();
}

export function normalizeTags(tags: string[]): string[] {
	const normalized = tags.map(normalizeTag).filter((t) => t.length > 0);
	return [...new Set(normalized)];
}
