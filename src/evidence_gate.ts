import { resolveStrict } from './config.ts';
import type { SoulsDb } from './database.ts';
import { SoulsStateError } from './errors.ts';
import type { CrystallizationCheckOptions } from './shards/check_crystallization_for_soul.ts';
import { checkCrystallizationForSoul } from './shards/check_crystallization_for_soul.ts';
export interface EvidenceGateOptions extends CrystallizationCheckOptions {
	strict?: boolean | undefined;
	shardIds?: number[] | undefined;
	operator?: string | undefined;
	reason?: string | undefined;
	now?: number | undefined;
}
export function evidenceGate(db: SoulsDb, soulId: number, options: EvidenceGateOptions): string[] {
	const warnings: string[] = [];
	if (!checkCrystallizationForSoul(db, soulId, options)?.ready)
		warnings.push(`Soul ${soulId} is not crystallization-ready.`);
	if (!options.shardIds?.length) warnings.push('At least one cited shard id is required.');
	if (resolveStrict(db, options.strict) && !options.operator?.trim() && warnings.length)
		throw new SoulsStateError(warnings.join(' '));
	if (resolveStrict(db, options.strict) && options.operator?.trim() && warnings.length)
		return [`operator correction by ${options.operator.trim()} bypassed: ${warnings.join(' ')}`];
	return warnings;
}
