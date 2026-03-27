import { useState } from 'preact/hooks';
import type { TraitRecord } from '../../traits/types.ts';
import { relativeAge } from '../format.ts';
import { Badge } from './badge.tsx';

interface TraitCardProps {
	trait: TraitRecord;
	staleDays?: number;
	now?: number;
	onClick?: () => void;
	selected?: boolean;
}

const MS_PER_DAY = 86_400_000;

export function TraitCard({
	trait,
	staleDays = 90,
	now = Date.now(),
	onClick,
	selected,
}: TraitCardProps) {
	const [expanded, setExpanded] = useState(false);
	const age = now - Math.max(trait.createdAt, trait.updatedAt);
	const isStale = age > staleDays * MS_PER_DAY;

	const cls = ['trait-card', isStale ? 'trait-card-stale' : '', selected ? 'pill-active' : '']
		.filter(Boolean)
		.join(' ');

	const handleClick = () => {
		if (onClick) {
			onClick();
		} else {
			setExpanded(!expanded);
		}
	};

	return (
		<button
			type="button"
			class={cls}
			onClick={handleClick}
			style={{ textAlign: 'left', width: '100%' }}
		>
			<div class="trait-principle">{trait.principle}</div>
			<div class="trait-meta">
				<Badge variant="muted">gen {trait.generation}</Badge>
				{isStale && <Badge variant="warn">stale</Badge>}
				<span class="muted" style={{ fontSize: '0.75rem', marginLeft: 'auto' }}>
					{relativeAge(Math.max(trait.createdAt, trait.updatedAt), now)}
				</span>
			</div>
			{expanded && <div class="trait-provenance">{trait.provenance}</div>}
		</button>
	);
}
