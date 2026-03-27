import type { EtherSourceInput } from './types.ts';

export const AWESOME_PROMPTS: EtherSourceInput = {
	id: 'awesome-chatgpt-prompts',
	kind: 'github-csv',
	url: 'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv',
	label: 'Awesome ChatGPT Prompts',
};

export const ROSEHILL_LIBRARY: EtherSourceInput = {
	id: 'rosehill-system-prompts',
	kind: 'github-json',
	url: 'https://raw.githubusercontent.com/danielrosehill/System-Prompt-Library/main/index/index.json',
	label: 'System Prompt Library (Rosehill)',
};

export const ALL_KNOWN_SOURCES: readonly EtherSourceInput[] = [AWESOME_PROMPTS, ROSEHILL_LIBRARY];
