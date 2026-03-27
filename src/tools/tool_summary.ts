export function summarizeCount(count: number, singular: string, plural?: string): string {
	const noun = count === 1 ? singular : (plural ?? `${singular}s`);
	return `${count} ${noun}`;
}

export function summarizeSoul(id: number, name: string): string {
	return `"${name}" (ID: ${id})`;
}
