import type { ShardRecord } from '../shards/types.ts';
import type { SoulRecord } from '../souls/types.ts';
import type { TraitRecord } from '../traits/types.ts';
import type { ToolEntityRef } from './tool_types.ts';

export function toSoulRef(record: SoulRecord): ToolEntityRef {
	return { kind: 'soul', id: record.id, title: record.name };
}

export function toSoulIdRef(id: number, name?: string): ToolEntityRef {
	return { kind: 'soul', id, title: name };
}

export function toTraitRef(record: TraitRecord): ToolEntityRef {
	return { kind: 'trait', id: record.id, title: record.principle };
}

export function toTraitIdRef(id: number, principle?: string): ToolEntityRef {
	return { kind: 'trait', id, title: principle };
}

export function toShardRef(record: ShardRecord): ToolEntityRef {
	return { kind: 'shard', id: record.id, title: record.content.slice(0, 80) };
}

export function toShardIdRef(id: number): ToolEntityRef {
	return { kind: 'shard', id };
}
