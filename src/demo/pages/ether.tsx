import { useEffect, useState } from 'preact/hooks';
import type { SoulsDb } from '../../database.ts';
import { EmptyState } from '../components/empty_state.tsx';
import { Explainer } from '../components/explainer.tsx';
import { Panel } from '../components/panel.tsx';
import { getEtherDb } from '../ether_db.ts';
import { navigate } from '../router.tsx';

interface EtherSearchRow {
	id: number;
	source_id: string;
	name: string;
	description: string;
	content: string;
	category: string | null;
	rank: number;
}

function searchEther(db: SoulsDb, query: string, limit = 50): EtherSearchRow[] {
	const q = query.trim();
	if (q.length < 2) return [];

	try {
		db.exec("INSERT INTO ether_fts(ether_fts) VALUES('rebuild')");
	} catch {}

	try {
		return db
			.prepare(
				`SELECT e.*, fts.rank
				 FROM ether_fts fts
				 JOIN ether_entries e ON e.id = fts.rowid
				 WHERE ether_fts MATCH ?
				 ORDER BY fts.rank
				 LIMIT ?`,
			)
			.all<EtherSearchRow>(q, limit);
	} catch {
		return db
			.prepare(
				`SELECT e.*, 0 AS rank
				 FROM ether_entries e
				 WHERE e.name LIKE ? OR e.description LIKE ? OR e.content LIKE ?
				 ORDER BY e.name ASC
				 LIMIT ?`,
			)
			.all<EtherSearchRow>(`%${q}%`, `%${q}%`, `%${q}%`, limit);
	}
}

function getEtherStats(db: SoulsDb) {
	const total = db.prepare(`SELECT COUNT(*) AS cnt FROM ether_entries`).get<{ cnt: number }>();
	const sources = db.prepare(`SELECT id, label, entry_count FROM ether_sources ORDER BY id`).all<{
		id: string;
		label: string;
		entry_count: number;
	}>();
	return { total: total?.cnt ?? 0, sources };
}

function truncate(text: string, max: number): string {
	if (text.length <= max) return text;
	return `${text.slice(0, max)}...`;
}

function sourceBadge(sourceId: string) {
	const label = sourceId === 'awesome-chatgpt-prompts' ? 'Awesome' : 'Rosehill';
	const cls = sourceId === 'awesome-chatgpt-prompts' ? 'pill-btn' : 'pill-btn pill-accent';
	return <span class={cls}>{label}</span>;
}

export function Ether() {
	const [etherDb, setEtherDb] = useState<SoulsDb | null>(null);
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<EtherSearchRow[] | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getEtherDb().then((db) => {
			setEtherDb(db);
			setLoading(false);
		});
	}, []);

	useEffect(() => {
		if (!etherDb) return;
		if (query.trim().length < 2) {
			setResults(null);
			return;
		}
		setResults(searchEther(etherDb, query));
	}, [query, etherDb]);

	if (loading) {
		return (
			<>
				<h1 class="page-title">The Ether</h1>
				<Panel>
					<p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
						Loading soul templates...
					</p>
				</Panel>
			</>
		);
	}

	const stats = etherDb ? getEtherStats(etherDb) : null;

	return (
		<>
			<h1 class="page-title">The Ether</h1>
			<Explainer id="ether" />

			{stats && (
				<div class="stat-grid" style={{ marginBottom: 16 }}>
					<div class="stat-card">
						<div class="stat-value">{stats.total.toLocaleString()}</div>
						<div class="stat-label">Templates</div>
					</div>
					{stats.sources.map((s) => (
						<div class="stat-card" key={s.id}>
							<div class="stat-value">{s.entry_count.toLocaleString()}</div>
							<div class="stat-label">{s.label}</div>
						</div>
					))}
				</div>
			)}

			<Panel>
				<div class="form-field">
					<span class="form-label">Search the ether</span>
					<input
						class="input"
						type="text"
						placeholder="Type at least 2 characters to search soul templates..."
						value={query}
						onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
					/>
				</div>
			</Panel>

			{results === null ? (
				<EmptyState
					glyph="~"
					title="Explore the ether"
					subtitle="Search across thousands of soul templates from open-source prompt libraries."
				/>
			) : results.length === 0 ? (
				<EmptyState
					glyph="~"
					title="No spirits found"
					subtitle={`Nothing in the ether matches "${query}".`}
				/>
			) : (
				<Panel
					title="Results"
					subtitle={`${results.length} template${results.length !== 1 ? 's' : ''}`}
				>
					{results.map((r) => (
						<button
							type="button"
							key={r.id}
							class="soul-card"
							onClick={() => navigate(`/ether/${r.id}`)}
							style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
						>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									gap: 8,
									marginBottom: 4,
								}}
							>
								<strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
									{r.name}
								</strong>
								{sourceBadge(r.source_id)}
							</div>
							{r.description && (
								<div
									style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 6 }}
								>
									{truncate(r.description, 120)}
								</div>
							)}
							<div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
								{truncate(r.content, 200)}
							</div>
							{r.category && (
								<div style={{ marginTop: 6 }}>
									<span class="pill-btn" style={{ fontSize: '0.68rem' }}>
										{r.category}
									</span>
								</div>
							)}
						</button>
					))}
				</Panel>
			)}
		</>
	);
}
