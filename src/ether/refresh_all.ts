import type { SoulsDb } from '../database.ts';
import { listSources } from './list_sources.ts';
import { refreshSource } from './refresh_source.ts';
import type { EtherRefreshAllResult, EtherRefreshResult, RefreshOptions } from './types.ts';

export async function refreshAll(
	db: SoulsDb,
	options?: RefreshOptions,
): Promise<EtherRefreshAllResult> {
	const sources = listSources(db);
	const results: EtherRefreshResult[] = [];

	for (const source of sources) {
		const result = await refreshSource(db, source.id, options);
		results.push(result);
	}

	const totalEntries = results.reduce((sum, r) => sum + r.entriesWritten, 0);
	return { results, totalEntries };
}
