import * as read from '../../read.ts';
import { Panel } from '../components/panel.tsx';
import { ShardCard } from '../components/shard_card.tsx';
import { useDb, useLiveData } from '../hooks.ts';

export function ObserveFeed() {
	const db = useDb();

	const shards = useLiveData(() => read.listShards(db, { limit: 20 }), []);

	if (shards.length === 0) {
		return (
			<Panel title="Recent Observations">
				<p class="muted">No shards deposited yet.</p>
			</Panel>
		);
	}

	return (
		<Panel title="Recent Observations" subtitle={`Last ${shards.length} shards`}>
			{shards.map((s) => (
				<ShardCard key={s.id} shard={s} />
			))}
		</Panel>
	);
}
