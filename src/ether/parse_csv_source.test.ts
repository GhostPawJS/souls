import { deepStrictEqual, strictEqual, throws } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EtherParseError } from './errors.ts';
import { parseCsvSource } from './parse_csv_source.ts';

describe('parseCsvSource', () => {
	it('parses basic CSV rows', () => {
		const csv = `act,prompt,for_devs,type,contributor\nLinux Terminal,"Act as a linux terminal.",TRUE,TEXT,alice\n`;
		const entries = parseCsvSource(csv);
		strictEqual(entries.length, 1);
		strictEqual(entries[0]!.name, 'Linux Terminal');
		strictEqual(entries[0]!.content, 'Act as a linux terminal.');
		strictEqual(entries[0]!.category, 'TEXT');
	});

	it('handles quoted fields with commas', () => {
		const csv = `act,prompt\n"Travel Guide","I will suggest places, restaurants, and hotels."\n`;
		const entries = parseCsvSource(csv);
		strictEqual(entries[0]!.content, 'I will suggest places, restaurants, and hotels.');
	});

	it('handles escaped double-quotes', () => {
		const csv = `act,prompt\nTest,"She said ""hello"" to me."\n`;
		const entries = parseCsvSource(csv);
		strictEqual(entries[0]!.content, 'She said "hello" to me.');
	});

	it('handles multiline quoted fields', () => {
		const csv = `act,prompt\nPoet,"Write a poem.\n\nMake it beautiful."\n`;
		const entries = parseCsvSource(csv);
		strictEqual(entries[0]!.content, 'Write a poem.\n\nMake it beautiful.');
	});

	it('skips rows with empty act or prompt', () => {
		const csv = `act,prompt\n,"no act here"\nSomething,\n"Valid","Valid content"\n`;
		const entries = parseCsvSource(csv);
		strictEqual(entries.length, 1);
		strictEqual(entries[0]!.name, 'Valid');
	});

	it('generates externalId from name', () => {
		const csv = `act,prompt\nJavaScript Console,"Act as a JS console."\n`;
		const entries = parseCsvSource(csv);
		strictEqual(entries[0]!.externalId, 'javascript-console');
	});

	it('stores contributor in metadata', () => {
		const csv = `act,prompt,contributor\nBot,"Do stuff",alice\n`;
		const entries = parseCsvSource(csv);
		const meta = JSON.parse(entries[0]!.metadata!);
		strictEqual(meta.contributor, 'alice');
	});

	it('throws on empty CSV', () => {
		throws(() => parseCsvSource(''), EtherParseError);
	});

	it('throws on CSV without required columns', () => {
		throws(() => parseCsvSource('name,value\na,b\n'), EtherParseError);
	});

	it('handles CRLF line endings', () => {
		const csv = `act,prompt\r\nBot,"Hello"\r\n`;
		const entries = parseCsvSource(csv);
		strictEqual(entries.length, 1);
		strictEqual(entries[0]!.name, 'Bot');
	});

	it('handles multiple rows', () => {
		const csv = `act,prompt\nA,"Content A"\nB,"Content B"\nC,"Content C"\n`;
		const entries = parseCsvSource(csv);
		strictEqual(entries.length, 3);
		deepStrictEqual(
			entries.map((e) => e.name),
			['A', 'B', 'C'],
		);
	});
});
