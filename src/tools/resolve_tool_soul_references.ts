import type { SoulsDb } from '../database.ts';
import { resolveSoulReference } from '../souls/resolve_soul_reference.ts';

type Resolved<T> = {
	[K in keyof T]: K extends 'soulId'
		? Exclude<T[K], string>
		: K extends 'soulIds'
			? Exclude<T[K], (number | string)[]> | number[]
			: K extends 'shards'
				? T[K] extends (infer U)[] | undefined
					? Resolved<U>[] | Extract<T[K], undefined>
					: T[K]
				: T[K];
};
export function resolveToolSoulReferences<T extends object>(db: SoulsDb, input: T): Resolved<T> {
	const result = { ...input } as Record<string, unknown>;
	const resolve = (ref: unknown) => (typeof ref === 'string' ? resolveSoulReference(db, ref) : ref);
	if (result.soulId !== undefined) result.soulId = resolve(result.soulId);
	if (Array.isArray(result.soulIds)) result.soulIds = result.soulIds.map(resolve);
	if (Array.isArray(result.shards))
		result.shards = result.shards.map((shard) => resolveToolSoulReferences(db, shard));
	return result as Resolved<T>;
}
