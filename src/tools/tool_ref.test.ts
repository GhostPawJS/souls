import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	toShardIdRef,
	toShardRef,
	toSoulIdRef,
	toSoulRef,
	toTraitIdRef,
	toTraitRef,
} from './tool_ref.ts';

describe('toSoulRef', () => {
	it('maps a soul record to entity ref', () => {
		const ref = toSoulRef({ id: 1, name: 'Codex' } as Parameters<typeof toSoulRef>[0]);
		strictEqual(ref.kind, 'soul');
		strictEqual(ref.id, 1);
		strictEqual(ref.title, 'Codex');
	});
});

describe('toSoulIdRef', () => {
	it('creates ref from id and name', () => {
		const ref = toSoulIdRef(5, 'Alpha');
		strictEqual(ref.kind, 'soul');
		strictEqual(ref.id, 5);
		strictEqual(ref.title, 'Alpha');
	});

	it('creates ref from id only — title is undefined', () => {
		const ref = toSoulIdRef(5);
		strictEqual(ref.kind, 'soul');
		strictEqual(ref.title, undefined);
	});
});

describe('toTraitRef', () => {
	it('maps a trait record to entity ref', () => {
		const ref = toTraitRef({ id: 10, principle: 'Be clear' } as Parameters<typeof toTraitRef>[0]);
		strictEqual(ref.kind, 'trait');
		strictEqual(ref.id, 10);
		strictEqual(ref.title, 'Be clear');
	});
});

describe('toTraitIdRef', () => {
	it('creates ref with principle', () => {
		const ref = toTraitIdRef(3, 'Stay concise');
		strictEqual(ref.title, 'Stay concise');
	});

	it('creates ref without principle', () => {
		const ref = toTraitIdRef(3);
		strictEqual(ref.title, undefined);
	});
});

describe('toShardRef', () => {
	it('maps a shard record to entity ref with truncated title', () => {
		const longContent = 'A'.repeat(200);
		const ref = toShardRef({ id: 7, content: longContent } as Parameters<typeof toShardRef>[0]);
		strictEqual(ref.kind, 'shard');
		strictEqual(ref.id, 7);
		strictEqual(ref.title!.length, 80);
	});

	it('uses full content when short', () => {
		const ref = toShardRef({ id: 8, content: 'short' } as Parameters<typeof toShardRef>[0]);
		strictEqual(ref.title, 'short');
	});
});

describe('toShardIdRef', () => {
	it('creates ref from id only', () => {
		const ref = toShardIdRef(99);
		strictEqual(ref.kind, 'shard');
		strictEqual(ref.id, 99);
		strictEqual(ref.title, undefined);
	});
});
