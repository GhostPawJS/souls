import { useState } from 'preact/hooks';
import type { SoulsDb } from '../../database.ts';
import * as read from '../../read.ts';
import { mapShardRow } from '../../shards/map_shard_row.ts';
import type { ShardRecord, ShardRow } from '../../shards/types.ts';
import { EmptyState } from '../components/empty_state.tsx';
import { Explainer } from '../components/explainer.tsx';
import { Panel } from '../components/panel.tsx';
import { ShardCard } from '../components/shard_card.tsx';
import { useDb, useLiveData } from '../hooks.ts';

function rebuildFts(db: SoulsDb): void {
	try {
		db.exec("INSERT INTO shard_fts(shard_fts) VALUES('rebuild')");
	} catch {}
}

function searchWithFallback(db: SoulsDb, q: string): ShardRecord[] {
	rebuildFts(db);
	try {
		return read.searchShards(db, q);
	} catch {
		const sql = `SELECT ss.* FROM soul_shards ss WHERE ss.content LIKE ? ORDER BY ss.created_at DESC`;
		return db
			.prepare(sql)
			.all<ShardRow>(`%${q}%`)
			.map((row) => mapShardRow(db, row));
	}
}

export function Search() {
	const db = useDb();
	const [query, setQuery] = useState('');

	const results = useLiveData(() => {
		if (query.trim().length < 2) return null;
		return searchWithFallback(db, query.trim());
	}, [query]);

	return (
		<>
			<h1 class="page-title">Search</h1>
			<Explainer id="search" />
			<Panel>
				<div class="form-field">
					<span class="form-label">Search shard content</span>
					<input
						class="input"
						type="text"
						placeholder="Type at least 2 characters to search..."
						value={query}
						onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
					/>
				</div>
			</Panel>
			{results === null ? (
				<EmptyState
					glyph="?"
					title="Start searching"
					subtitle="Enter a query to search across all shard content."
				/>
			) : results.length === 0 ? (
				<EmptyState glyph="?" title="No results" subtitle={`No shards match "${query}".`} />
			) : (
				<Panel
					title="Results"
					subtitle={`${results.length} shard${results.length !== 1 ? 's' : ''} found`}
				>
					{results.map((s) => (
						<ShardCard key={s.id} shard={s} />
					))}
				</Panel>
			)}
		</>
	);
}
