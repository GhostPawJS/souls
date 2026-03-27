import * as read from '../../read.ts';
import { Bar } from '../components/bar.tsx';
import { Explainer } from '../components/explainer.tsx';
import { Panel } from '../components/panel.tsx';
import { ShardCard } from '../components/shard_card.tsx';
import { useDb, useLiveData } from '../hooks.ts';

const SOURCE_COLORS = [
	'var(--accent)',
	'var(--success)',
	'var(--warn)',
	'var(--danger)',
	'#60a5fa',
	'#c084fc',
];

export function DetailShards({ soulId }: { soulId: number }) {
	const db = useDb();

	const { shards, sources } = useLiveData(() => {
		const shards = read.listShards(db, { soulId });
		const sources = read.shardCountsBySource(db, soulId);
		return { shards, sources };
	}, [soulId]);

	const total = sources.reduce((s, r) => s + r.count, 0);

	return (
		<Panel title="Shard Evidence" subtitle={`${shards.length} pending observations`}>
			<Explainer id="detail/shards" />
			{sources.length > 0 && (
				<div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
					{sources.map((s, i) => (
						<Bar
							key={s.source}
							value={s.count}
							max={total}
							color={SOURCE_COLORS[i % SOURCE_COLORS.length]}
							label={s.source}
						/>
					))}
				</div>
			)}
			{shards.length === 0 ? (
				<p class="muted">No pending shards. Deposit observations to begin.</p>
			) : (
				shards.map((s) => <ShardCard key={s.id} shard={s} />)
			)}
		</Panel>
	);
}
