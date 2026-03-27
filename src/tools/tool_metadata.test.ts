import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	arraySchema,
	booleanSchema,
	defineSoulsTool,
	enumSchema,
	integerArraySchema,
	integerSchema,
	nullableStringSchema,
	numberSchema,
	objectSchema,
	oneOfSchema,
	stringArraySchema,
	stringSchema,
} from './tool_metadata.ts';

describe('defineSoulsTool', () => {
	it('returns the same tool definition object', () => {
		const handler = () => ({
			ok: true as const,
			outcome: 'success' as const,
			summary: '',
			entities: [],
			data: {},
		});
		const tool = defineSoulsTool({
			name: 'test_tool',
			description: 'A test tool',
			whenToUse: 'testing',
			whenNotToUse: 'production',
			sideEffects: 'none',
			readOnly: true,
			supportsClarification: false,
			targetKinds: ['soul'],
			inputDescriptions: { id: 'The soul ID' },
			outputDescription: 'result',
			inputSchema: objectSchema({ id: integerSchema('ID') }, ['id']),
			handler,
		});
		strictEqual(tool.name, 'test_tool');
		strictEqual(tool.sideEffects, 'none');
		strictEqual(tool.handler, handler);
	});
});

describe('schema helpers', () => {
	it('stringSchema produces string type', () => {
		const s = stringSchema('a name');
		strictEqual(s.type, 'string');
		strictEqual(s.description, 'a name');
	});

	it('numberSchema produces number type', () => {
		strictEqual(numberSchema('x').type, 'number');
	});

	it('integerSchema produces integer type', () => {
		strictEqual(integerSchema('id').type, 'integer');
	});

	it('booleanSchema produces boolean type', () => {
		strictEqual(booleanSchema('flag').type, 'boolean');
	});

	it('arraySchema wraps items', () => {
		const s = arraySchema(stringSchema('tag'), 'tags');
		strictEqual(s.type, 'array');
		ok(s.items);
		strictEqual(s.items!.type, 'string');
	});

	it('objectSchema includes properties and required', () => {
		const s = objectSchema({ name: stringSchema('n') }, ['name'], 'an object');
		strictEqual(s.type, 'object');
		deepStrictEqual(s.required, ['name']);
		ok(s.properties!.name);
	});

	it('objectSchema defaults required to empty array', () => {
		const s = objectSchema({ x: numberSchema('x') });
		deepStrictEqual(s.required, []);
	});

	it('enumSchema produces string enum', () => {
		const s = enumSchema(['a', 'b'], 'choices');
		strictEqual(s.type, 'string');
		deepStrictEqual(s.enum, ['a', 'b']);
	});

	it('oneOfSchema wraps schemas', () => {
		const s = oneOfSchema([stringSchema('a'), numberSchema('b')], 'either');
		ok(s.oneOf);
		strictEqual(s.oneOf!.length, 2);
	});

	it('nullableStringSchema produces string type', () => {
		const s = nullableStringSchema('optional');
		strictEqual(s.type, 'string');
	});

	it('integerArraySchema produces array of integer', () => {
		const s = integerArraySchema('ids');
		strictEqual(s.type, 'array');
		strictEqual(s.items!.type, 'integer');
	});

	it('stringArraySchema produces array of string', () => {
		const s = stringArraySchema('names');
		strictEqual(s.type, 'array');
		strictEqual(s.items!.type, 'string');
	});
});
