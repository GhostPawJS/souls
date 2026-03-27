import type { LevelRecord } from '../../levels/types.ts';
import { relativeAge } from '../format.ts';
import { Badge, LevelBadge } from './badge.tsx';

interface LevelNodeProps {
	record: LevelRecord;
	isCurrent: boolean;
	now?: number;
}

export function LevelNode({ record, isCurrent, now = Date.now() }: LevelNodeProps) {
	return (
		<div class="timeline-node">
			<div class={`timeline-marker ${isCurrent ? 'timeline-marker-current' : ''}`} />
			<div class="timeline-body">
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					<LevelBadge level={record.level} size="sm" />
					<span class="timeline-title">Level {record.level}</span>
					<span class="timeline-time">{relativeAge(record.createdAt, now)}</span>
				</div>
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
					{record.traitsConsolidated.length > 0 && (
						<Badge variant="accent">{record.traitsConsolidated.length} consolidated</Badge>
					)}
					{record.traitsPromoted.length > 0 && (
						<Badge variant="success">{record.traitsPromoted.length} promoted</Badge>
					)}
					{record.traitsCarried.length > 0 && (
						<Badge variant="muted">{record.traitsCarried.length} carried</Badge>
					)}
				</div>
				{record.essenceBefore !== record.essenceAfter && (
					<div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
						<div class="diff-before">{record.essenceBefore}</div>
						<div class="diff-after">{record.essenceAfter}</div>
					</div>
				)}
			</div>
		</div>
	);
}
