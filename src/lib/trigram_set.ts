export function trigramSet(text: string): Set<string> {
	const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
	const padded = `  ${normalized}  `;
	const result = new Set<string>();
	for (let i = 0; i < padded.length - 2; i++) {
		result.add(padded.slice(i, i + 3));
	}
	return result;
}
