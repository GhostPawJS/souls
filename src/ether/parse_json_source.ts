import { EtherParseError } from './errors.ts';
import type { RawEtherEntry } from './types.ts';

interface RosehillPrompt {
	agent_name?: string;
	description?: string;
	features?: Record<string, boolean>;
	metadata?: { original_filename?: string };
	full_data?: {
		'System Prompt'?: string | null;
		'Creation Date'?: string | null;
		[key: string]: unknown;
	};
}

interface RosehillIndex {
	metadata?: { total_prompts?: number };
	prompts?: RosehillPrompt[];
}

export function parseJsonSource(text: string): RawEtherEntry[] {
	let data: RosehillIndex;
	try {
		data = JSON.parse(text) as RosehillIndex;
	} catch {
		throw new EtherParseError('Failed to parse JSON response.');
	}

	const prompts = data.prompts;
	if (!Array.isArray(prompts)) {
		throw new EtherParseError('JSON missing "prompts" array.');
	}

	const entries: RawEtherEntry[] = [];

	for (const p of prompts) {
		const systemPrompt = p.full_data?.['System Prompt'];
		if (!systemPrompt || typeof systemPrompt !== 'string' || !systemPrompt.trim()) continue;

		const name = (p.agent_name ?? '').trim();
		if (!name) continue;

		const externalId =
			p.metadata?.original_filename ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

		const featureFlags = p.features ?? {};
		const metadataObj: Record<string, unknown> = {};
		if (p.full_data?.['Creation Date']) {
			metadataObj.creationDate = p.full_data['Creation Date'];
		}
		for (const [key, val] of Object.entries(featureFlags)) {
			if (val === true) metadataObj[key] = true;
		}

		entries.push({
			externalId,
			name,
			description: (p.description ?? '').trim(),
			content: systemPrompt.trim(),
			category: featureFlags.is_agent ? 'agent' : undefined,
			tags: undefined,
			metadata: Object.keys(metadataObj).length > 0 ? JSON.stringify(metadataObj) : undefined,
		});
	}

	return entries;
}
