import { useState } from 'preact/hooks';
import type { LevelUpPlan } from '../../levels/types.ts';
import * as read from '../../read.ts';
import { LevelBadge } from '../components/badge.tsx';
import { EmptyState } from '../components/empty_state.tsx';
import { useDb, useLiveData } from '../hooks.ts';
import { navigate } from '../router.tsx';
import { LevelUpGate } from './levelup_gate.tsx';
import { LevelUpPlanner } from './levelup_planner.tsx';
import { LevelUpPreview } from './levelup_preview.tsx';

export function LevelUp({ soulId }: { soulId: number }) {
	const db = useDb();
	const [plan, setPlan] = useState<LevelUpPlan | null>(null);

	const soul = useLiveData(() => {
		try {
			return read.getSoul(db, soulId);
		} catch {
			return null;
		}
	}, [soulId]);

	if (!soul) {
		return (
			<EmptyState glyph="?" title="Soul not found">
				<button type="button" class="btn btn-primary" onClick={() => navigate('/')}>
					Back to Roster
				</button>
			</EmptyState>
		);
	}

	return (
		<>
			<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
				<button
					type="button"
					class="btn btn-sm btn-muted"
					onClick={() => navigate(`/soul/${soulId}`)}
				>
					Back
				</button>
				<LevelBadge level={soul.level} />
				<h1 class="page-title" style={{ marginBottom: 0 }}>
					Level Up {soul.name}
				</h1>
			</div>
			<LevelUpGate soulId={soulId} />
			<LevelUpPlanner soulId={soulId} onPlanChange={setPlan} />
			<LevelUpPreview soulId={soulId} plan={plan} />
		</>
	);
}
