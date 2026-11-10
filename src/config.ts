import type { SoulsDb } from './database.ts';
import { SoulsValidationError } from './errors.ts';
export function initConfigTables(db: SoulsDb): void {
	db.exec(
		'CREATE TABLE IF NOT EXISTS souls_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT',
	);
}
export function getSoulsConfig(db: SoulsDb): Record<string, string> {
	return Object.fromEntries(
		db
			.prepare('SELECT key,value FROM souls_settings ORDER BY key')
			.all<{ key: string; value: string }>()
			.map((r) => [r.key, r.value]),
	);
}
export function setSoulsConfig(db: SoulsDb, key: string, value: string): void {
	if (
		!(
			(key === 'strict' && ['true', 'false'].includes(value)) ||
			(key === 'readiness' && ['converged', 'legacy'].includes(value))
		)
	)
		throw new SoulsValidationError(
			key === 'readiness' ? 'Expected readiness converged|legacy.' : 'Expected strict true|false.',
		);
	db.prepare(
		'INSERT INTO souls_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
	).run(key, value);
}
export function resolveStrict(db: SoulsDb, strict?: boolean): boolean {
	if (strict !== undefined) return strict;
	const env = process.env.GHOSTPAW_SOULS_STRICT?.toLowerCase();
	if (['1', 'true', 'yes'].includes(env ?? '')) return true;
	if (['0', 'false', 'no'].includes(env ?? '')) return false;
	return getSoulsConfig(db).strict === 'true';
}

export function resolveReadiness(
	db: SoulsDb,
	readiness?: 'converged' | 'legacy',
): 'converged' | 'legacy' {
	const value =
		readiness ??
		process.env.GHOSTPAW_SOULS_READINESS ??
		getSoulsConfig(db).readiness ??
		'converged';
	if (value !== 'converged' && value !== 'legacy')
		throw new SoulsValidationError('readiness must be converged|legacy');
	return value;
}
