import type { SoulsDb } from '../database.ts';
import { createSoul } from '../souls/create_soul.ts';
import type { SoulRecord } from '../souls/types.ts';
import { EtherError } from './errors.ts';
import type { EtherEntry, ManifestOptions } from './types.ts';

const MAX_FALLBACK_DESCRIPTION_LENGTH = 200;

export function manifestSoul(
	soulsDb: SoulsDb,
	entry: EtherEntry,
	options?: ManifestOptions,
): SoulRecord {
	const name = (options?.name ?? entry.name).trim();
	const essence = entry.content;

	let description = (options?.description ?? entry.description).trim();
	if (!description) {
		description =
			essence.length > MAX_FALLBACK_DESCRIPTION_LENGTH
				? `${essence.slice(0, MAX_FALLBACK_DESCRIPTION_LENGTH)}...`
				: essence;
	}

	if (!name) throw new EtherError('Cannot manifest a soul without a name.');
	if (!essence) throw new EtherError('Cannot manifest a soul without essence (content).');

	return createSoul(soulsDb, {
		name,
		essence,
		description,
		slug: options?.slug,
		now: options?.now,
	});
}
