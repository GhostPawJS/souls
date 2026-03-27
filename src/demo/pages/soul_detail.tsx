import * as read from '../../read.ts';
import { LevelBadge } from '../components/badge.tsx';
import { EmptyState } from '../components/empty_state.tsx';
import { useDb, useLiveData } from '../hooks.ts';
import { navigate } from '../router.tsx';
import { DetailActions } from './detail_actions.tsx';
import { DetailHealth } from './detail_health.tsx';
import { DetailIdentity } from './detail_identity.tsx';
import { DetailLevels } from './detail_levels.tsx';
import { DetailShards } from './detail_shards.tsx';
import { DetailTraits } from './detail_traits.tsx';

export function SoulDetail({ soulId }: { soulId: number }) {
	const db = useDb();

	const soul = useLiveData(() => {
		try {
			return read.getSoul(db, soulId);
		} catch {
			return null;
		}
	}, [soulId]);

	if (!soul) {
		return (
			<EmptyState glyph="?" title="Soul not found" subtitle={`No soul with ID ${soulId} exists.`}>
				<button type="button" class="btn btn-primary" onClick={() => navigate('/')}>
					Back to Roster
				</button>
			</EmptyState>
		);
	}

	return (
		<>
			<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
				<button type="button" class="btn btn-sm btn-muted" onClick={() => navigate('/')}>
					Back
				</button>
				<LevelBadge level={soul.level} size="lg" />
				<div>
					<h1 class="page-title" style={{ marginBottom: 0 }}>
						{soul.name}
					</h1>
					<p class="muted" style={{ fontSize: '0.85rem' }}>
						{soul.description}
					</p>
				</div>
			</div>
			<DetailActions soulId={soulId} />
			<DetailIdentity soulId={soulId} />
			<DetailHealth soulId={soulId} />
			<DetailTraits soulId={soulId} />
			<DetailShards soulId={soulId} />
			<DetailLevels soulId={soulId} currentLevel={soul.level} />
		</>
	);
}
