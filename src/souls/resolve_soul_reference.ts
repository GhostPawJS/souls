import type { SoulsDb } from '../database.ts';
import { SoulsNotFoundError, SoulsValidationError } from '../errors.ts';
import { getSoul } from './get_soul.ts';
import { getSoulByExternalId } from './get_soul_by_external_id.ts';
import { getSoulByName } from './get_soul_by_name.ts';
export function resolveSoulReference(db: SoulsDb, ref: string): number {
	const tried: string[] = [];
	const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(ref);
	const hint = uuid ? `; did you mean ext:${ref}?` : '';
	if (/^\d+$/.test(ref)) {
		tried.push('numeric id');
		const soul = getSoul(db, Number(ref));
		if (soul) return soul.id;
	}
	if (ref.startsWith('ext:')) {
		tried.push('external ref');
		const soul = getSoulByExternalId(db, ref.slice(4));
		if (soul) return soul.id;
	}
	tried.push('slug');
	const slugs = db
		.prepare('SELECT id FROM souls WHERE slug = ? AND deleted_at IS NULL')
		.all<{ id: number }>(ref);
	if (slugs.length > 1)
		throw new SoulsValidationError(
			`Ambiguous soul: ${ref}; tried ${tried.join(', ')}; matching IDs: ${slugs.map((s) => s.id).join(', ')}${hint}`,
		);
	if (slugs[0]) return slugs[0].id;
	tried.push('name');
	const soul = getSoulByName(db, ref);
	if (soul) return soul.id;
	if (uuid) {
		const external = getSoulByExternalId(db, ref);
		if (external) return external.id;
	}
	throw new SoulsNotFoundError(
		`Soul not found: ${ref}; tried ${tried.join(', ')} (resolution order: numeric id, ext: external ref, slug, name).${hint}`,
	);
}
