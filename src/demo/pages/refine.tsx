import * as read from '../../read.ts';
import { LevelBadge } from '../components/badge.tsx';
import { EmptyState } from '../components/empty_state.tsx';
import { useDb, useLiveData } from '../hooks.ts';
import { navigate } from '../router.tsx';
import { RefineActions } from './refine_actions.tsx';
import { RefineEvidence } from './refine_evidence.tsx';
import { RefinePreview } from './refine_preview.tsx';

export function Refine({ soulId }: { soulId: number }) {
	const db = useDb();

	const data = useLiveData(() => {
		try {
			const soul = read.getSoul(db, soulId);
			if (!soul) return null;
			const report = read.formatEvidence(db, soulId);
			return { soul, report };
		} catch {
			return null;
		}
	}, [soulId]);

	if (!data) {
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
				<LevelBadge level={data.soul.level} />
				<h1 class="page-title" style={{ marginBottom: 0 }}>
					Refine {data.soul.name}
				</h1>
			</div>
			<div class="split-layout">
				<RefineEvidence report={data.report} />
				<RefineActions soulId={soulId} />
			</div>
			<RefinePreview soulId={soulId} />
		</>
	);
}
