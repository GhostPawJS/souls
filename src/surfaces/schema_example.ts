import type { JsonSchema } from './surface_types.ts';

// Action requirements supplement schemas whose optional fields serve several operations.
const actionFields: Record<string, Record<string, string[]>> = {
	manage_soul: {
		create: ['name', 'essence', 'description'],
		update: ['soulId'],
		retire: ['soulId'],
		awaken: ['soulId'],
	},
	observe_soul: {
		drop: ['content', 'source', 'soulIds'],
		drop_batch: ['shards'],
		reveal: ['shardIds'],
	},
	refine_soul: {
		add_trait: ['soulId', 'principle', 'provenance'],
		revise_trait: ['traitId', 'principle', 'provenance'],
		revert_trait: ['traitId'],
		reactivate_trait: ['traitId'],
		cite_shard: ['traitId', 'shardId'],
		stamp_attuned: ['soulId'],
	},
	level_up_soul: { validate: ['plan'], execute: ['plan'], revert: [] },
};

export function schemaExample(schema: JsonSchema, name = '', action?: string): unknown {
	if (schema.enum) return action && schema.enum.includes(action) ? action : schema.enum[0];
	if (schema.oneOf) return schemaExample(schema.oneOf[0] ?? {}, name);
	if (schema.type === 'object' || schema.properties) {
		const actions = schema.properties?.action?.enum;
		if (actions && (!action || !actions.includes(action))) action = String(actions[0]);
		const required = new Set([
			...(schema.required ?? []),
			...(actionFields[name]?.[action ?? ''] ?? []),
		]);
		return Object.fromEntries(
			[...required].map((key) => [
				key,
				key === 'action' && action ? action : schemaExample(schema.properties?.[key] ?? {}, key),
			]),
		);
	}
	if (schema.type === 'array') return [];
	if (schema.type === 'integer' || schema.type === 'number') return 1;
	if (schema.type === 'boolean') return false;
	return (
		(
			{
				name: 'Reviewer',
				query: 'review',
				essence: 'Read intent before details.',
				description: 'Code review identity',
				content: 'Observed careful review.',
				source: 'manual_review',
				principle: 'Check intent before details.',
				provenance: 'Repeated review observations.',
				newEssence: 'Review intent and evidence.',
			} as Record<string, string>
		)[name] ?? '...'
	);
}
