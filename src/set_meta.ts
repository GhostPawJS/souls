import type { SoulsDb } from './database.ts';
import { SoulsValidationError } from './errors.ts';

export function setMeta(db: SoulsDb, key: string, value: string): void {
	if (!key) throw new SoulsValidationError('Meta key must not be empty.');
	const stmt = db.prepare(
		'INSERT INTO souls_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
	);
	stmt.run(key, value);
}
