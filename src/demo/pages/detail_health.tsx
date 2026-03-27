import * as read from '../../read.ts';
import { Explainer } from '../components/explainer.tsx';
import { HealthRing } from '../components/health_ring.tsx';
import { Panel } from '../components/panel.tsx';
import { useDb, useLiveData } from '../hooks.ts';

export function DetailHealth({ soulId }: { soulId: number }) {
	const db = useDb();

	const profile = useLiveData(() => read.getSoulProfile(db, soulId), [soulId]);

	return (
		<Panel title="Health">
			<Explainer id="detail/health" />
			<div style={{ display: 'grid', gap: 16 }}>
				<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
					<HealthRing health={profile.health} size={80} strokeWidth={6} />
				</div>
				<div class="stat-grid">
					<div class="stat-card">
						<span class="stat-value">
							{profile.activeTraitCount}/{profile.traitLimit}
						</span>
						<span class="stat-label">Traits</span>
						<span class="stat-sublabel">
							{profile.atCapacity
								? 'At capacity'
								: `${profile.traitLimit - profile.activeTraitCount} slots open`}
						</span>
					</div>
					<div class="stat-card">
						<span class="stat-value">{profile.pendingShardCount}</span>
						<span class="stat-label">Pending</span>
						<span class="stat-sublabel">observations</span>
					</div>
					<div class="stat-card">
						<span
							class="stat-value"
							style={{
								color: profile.crystallizationReady ? 'var(--success)' : 'var(--text-secondary)',
							}}
						>
							{profile.crystallizationReady ? 'Yes' : 'No'}
						</span>
						<span class="stat-label">Ready</span>
						<span class="stat-sublabel">for refinement</span>
					</div>
				</div>
			</div>
		</Panel>
	);
}
