import assert from 'node:assert/strict';
import { test } from 'node:test';
import { schemaRows } from './schema_rows.ts';

test('object and array parents describe fields and retain all nested rows', () => {
	const properties = Object.fromEntries(
		Array.from({ length: 10 }, (_, i) => [
			`field${i}`,
			{ type: 'string', description: `Field ${i}` },
		]),
	);
	const rows = schemaRows({
		properties: {
			quest: {
				type: 'object',
				required: ['title'],
				properties: {
					title: { type: 'string', description: 'Quest title' },
					objective: { type: 'string' },
				},
			},
			entries: { type: 'array', items: { type: 'object', required: ['field0'], properties } },
		},
	});
	assert.match(rows[0]!.description, /title \(required\), objective/);
	assert.ok(
		rows.some(
			(row) => row.name === 'quest.title' && row.description === 'Quest title' && row.required,
		),
	);
	assert.ok(rows.some((row) => row.name === 'entries[].field9' && row.description === 'Field 9'));
	assert.ok(rows.every((row) => row.description.trim()));
});
