import { useEffect, useState } from 'preact/hooks';
import * as write from '../../write.ts';
import { Explainer } from '../components/explainer.tsx';
import { Panel } from '../components/panel.tsx';
import { getEtherDb } from '../ether_db.ts';
import { useDb } from '../hooks.ts';
import { navigate } from '../router.tsx';
import { useAppState } from '../state.tsx';

interface EtherEntryRow {
	id: number;
	source_id: string;
	external_id: string;
	name: string;
	description: string;
	content: string;
	category: string | null;
	tags: string | null;
	metadata: string | null;
	fetched_at: number;
}

export function EtherDetail({ entryId }: { entryId: number }) {
	const soulsDb = useDb();
	const { refresh, toast } = useAppState();
	const [entry, setEntry] = useState<EtherEntryRow | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getEtherDb().then((db) => {
			const row = db
				.prepare(`SELECT * FROM ether_entries WHERE id = ?`)
				.get<EtherEntryRow>(entryId);
			setEntry(row ?? null);
			setLoading(false);
		});
	}, [entryId]);

	const handleManifest = () => {
		if (!entry) return;
		try {
			const description =
				entry.description ||
				(entry.content.length > 200 ? `${entry.content.slice(0, 200)}...` : entry.content);
			const soul = write.createSoul(soulsDb, {
				name: entry.name,
				essence: entry.content,
				description,
			});
			refresh();
			toast(`Manifested "${soul.name}" as a living soul.`);
			navigate(`/soul/${soul.id}`);
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Failed to manifest soul.', 'err');
		}
	};

	if (loading) {
		return (
			<>
				<h1 class="page-title">The Ether</h1>
				<Panel>
					<p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</p>
				</Panel>
			</>
		);
	}

	if (!entry) {
		return (
			<>
				<h1 class="page-title">The Ether</h1>
				<Panel>
					<p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Entry not found.</p>
				</Panel>
				<button type="button" class="btn btn-sm btn-muted" onClick={() => navigate('/ether')}>
					Back to Ether
				</button>
			</>
		);
	}

	const sourceLabel =
		entry.source_id === 'awesome-chatgpt-prompts'
			? 'Awesome ChatGPT Prompts'
			: 'System Prompt Library (Rosehill)';

	return (
		<>
			<h1 class="page-title">{entry.name}</h1>
			<Explainer id="ether/detail" />

			<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
				<button type="button" class="btn btn-sm btn-muted" onClick={() => navigate('/ether')}>
					&larr; Back to Ether
				</button>
				<button type="button" class="btn btn-primary" onClick={handleManifest}>
					Manifest as Soul
				</button>
			</div>

			<Panel title="Identity">
				<div class="stat-grid" style={{ marginBottom: 12 }}>
					<div class="stat-card">
						<div class="stat-value" style={{ fontSize: '0.85rem' }}>
							{sourceLabel}
						</div>
						<div class="stat-label">Source</div>
					</div>
					{entry.category && (
						<div class="stat-card">
							<div class="stat-value" style={{ fontSize: '0.85rem' }}>
								{entry.category}
							</div>
							<div class="stat-label">Category</div>
						</div>
					)}
				</div>
				{entry.description && (
					<div style={{ marginBottom: 12, color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
						{entry.description}
					</div>
				)}
			</Panel>

			<Panel title="System Prompt">
				<pre
					style={{
						whiteSpace: 'pre-wrap',
						wordBreak: 'break-word',
						fontSize: '0.82rem',
						lineHeight: 1.55,
						color: 'var(--text-primary)',
						maxHeight: '60vh',
						overflow: 'auto',
						padding: 0,
						margin: 0,
						background: 'transparent',
					}}
				>
					{entry.content}
				</pre>
			</Panel>
		</>
	);
}
