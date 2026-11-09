import type { SoulsDb } from '../database.ts';
import { getSoulOrThrow } from './get_soul_or_throw.ts';
import type { RenderSoulOptions } from './types.ts';

interface TraitRenderRow {
	principle: string;
	provenance: string;
	citation_count: number;
}

export function renderSoul(db: SoulsDb, id: number, options?: RenderSoulOptions): string {
	const soul = getSoulOrThrow(db, id);
	const includeProvenance = options?.includeProvenance ?? false;

	// Default order is citation count; density is citations per day of trait age.
	const traits = db
		.prepare(
			`SELECT t.principle, t.provenance,
				COUNT(DISTINCT sc.shard_id) AS citation_count
			 FROM soul_traits t
			 LEFT JOIN shard_citations sc ON sc.trait_id = t.id
			 WHERE t.soul_id = ? AND t.status = 'active'
			 GROUP BY t.id
			 ORDER BY ${options?.order === 'density' ? 'citation_count * 1.0 / MAX(1, (? - t.created_at) / 86400000.0)' : 'citation_count'} DESC, t.created_at ASC`,
		)
		.all<TraitRenderRow>(id, ...(options?.order === 'density' ? [options?.now ?? Date.now()] : []));

	const lines: string[] = [];

	lines.push(`# ${soul.name}`);
	lines.push(`*${soul.description}*`);
	lines.push('');
	lines.push(soul.essence);

	if (traits.length > 0) {
		lines.push('');
		lines.push('## Traits');
		for (const trait of traits) {
			if (includeProvenance) {
				lines.push(`- **${trait.principle}** — ${trait.provenance}`);
			} else {
				lines.push(`- ${trait.principle}`);
			}
		}
	}

	return lines.join('\n');
}
