import { useState } from 'preact/hooks';
import type { ShardRecord } from '../../shards/types.ts';
import { relativeAge } from '../format.ts';
import { Badge } from './badge.tsx';

interface ShardCardProps {
	shard: ShardRecord;
	now?: number;
}

export function ShardCard({ shard, now = Date.now() }: ShardCardProps) {
	const [expanded, setExpanded] = useState(false);

	return (
		<button
			type="button"
			class="shard-card"
			onClick={() => setExpanded(!expanded)}
			style={{ textAlign: 'left', width: '100%' }}
		>
			<div class={`shard-content ${expanded ? '' : 'shard-content-collapsed'}`}>
				{shard.content}
			</div>
			<div class="shard-meta">
				<Badge variant="accent">{shard.source}</Badge>
				{shard.sealed && <Badge variant="warn">sealed</Badge>}
				<span class="muted" style={{ fontSize: '0.75rem', marginLeft: 'auto' }}>
					{relativeAge(shard.createdAt, now)}
				</span>
			</div>
			{shard.tags.length > 0 && (
				<div class="shard-tags">
					{shard.tags.map((tag) => (
						<Badge key={tag} variant="muted">
							{tag}
						</Badge>
					))}
				</div>
			)}
		</button>
	);
}
