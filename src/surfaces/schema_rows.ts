import type { JsonSchema } from './surface_types.ts';

export function schemaRows(
	schema: JsonSchema,
	prefix = '',
): {
	name: string;
	type: string;
	required: boolean;
	description: string;
}[] {
	const rows = [];
	for (const [name, property] of Object.entries(schema.properties ?? {})) {
		const branches = property.oneOf ?? [property];
		const fields = branches.flatMap((branch) =>
			Object.entries(branch.properties ?? branch.items?.properties ?? {}).map(
				([key]) =>
					`${key}${(branch.required ?? branch.items?.required)?.includes(key) ? ' (required)' : ''}`,
			),
		);
		const type = String(
			property.type ?? branches.map((branch) => branch.type ?? 'any').join(' / '),
		);
		const description = [
			property.enum?.length ? `${property.enum.join(', ')}.` : '',
			property.description?.trim() ||
				(fields.length
					? `${property.items ? 'Array items' : 'Object'}: ${fields.join(', ')}`
					: `${type} value.`),
		]
			.filter(Boolean)
			.join(' ')
			.replaceAll('|', '\\|')
			.replaceAll('\n', ' ');
		rows.push({
			name: `${prefix}${name}`,
			type,
			required: schema.required?.includes(name) ?? false,
			description,
		});
		for (const branch of branches) {
			rows.push(...schemaRows(branch, `${prefix}${name}.`));
			if (branch.items)
				for (const item of branch.items.oneOf ?? [branch.items])
					rows.push(...schemaRows(item, `${prefix}${name}[].`));
		}
	}
	return rows;
}
