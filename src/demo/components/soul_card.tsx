import type { SoulProfile } from '../../souls/get_soul_profile.ts';
import type { SoulRecord } from '../../souls/types.ts';
import { navigate } from '../router.tsx';
import { LevelBadge } from './badge.tsx';
import { HealthRing } from './health_ring.tsx';
import { XpBar } from './xp_bar.tsx';

interface SoulCardProps {
	soul: SoulRecord;
	profile: SoulProfile;
}

export function SoulCard({ soul, profile }: SoulCardProps) {
	const cls = [
		'soul-card',
		profile.crystallizationReady ? 'soul-card-ready' : '',
		soul.isDormant ? 'soul-card-dormant' : '',
	]
		.filter(Boolean)
		.join(' ');

	const go = () => navigate(`/soul/${soul.id}`);

	return (
		<button type="button" class={cls} onClick={go} style={{ textAlign: 'left', width: '100%' }}>
			<div class="soul-card-header">
				<LevelBadge level={soul.level} />
				<span class="soul-card-name">{soul.name}</span>
				<HealthRing health={profile.health} size={36} strokeWidth={3} showLabel={false} />
			</div>
			<div class="soul-card-desc">{soul.description}</div>
			<XpBar
				current={profile.activeTraitCount}
				max={profile.traitLimit}
				label={`${profile.activeTraitCount} of ${profile.traitLimit} active traits`}
			/>
			<div class="soul-card-stats" style={{ marginTop: 8 }}>
				<span class="muted" style={{ fontSize: '0.78rem' }}>
					{profile.pendingShardCount} pending shard{profile.pendingShardCount !== 1 ? 's' : ''}
				</span>
				{profile.crystallizationReady && <span class="badge badge-accent">Ready</span>}
				{soul.isDormant && <span class="badge badge-muted">Dormant</span>}
			</div>
		</button>
	);
}
