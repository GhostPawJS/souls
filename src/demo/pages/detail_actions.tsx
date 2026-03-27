import { useState } from 'preact/hooks';
import * as read from '../../read.ts';
import * as write from '../../write.ts';
import { ActionButton } from '../components/action_button.tsx';
import { ConfirmDialog } from '../components/confirm_dialog.tsx';
import { useDb, useLiveData } from '../hooks.ts';
import { navigate } from '../router.tsx';
import { useAppState } from '../state.tsx';

export function DetailActions({ soulId }: { soulId: number }) {
	const db = useDb();
	const { refresh, toast } = useAppState();
	const [confirmRetire, setConfirmRetire] = useState(false);

	const soul = useLiveData(() => read.getSoul(db, soulId), [soulId]);
	const profile = useLiveData(() => read.getSoulProfile(db, soulId), [soulId]);

	if (!soul) return null;

	const handleRetire = () => {
		write.retireSoul(db, soulId);
		refresh();
		toast(`${soul.name} retired to dormancy.`);
		setConfirmRetire(false);
	};

	const handleAwaken = () => {
		write.awakenSoul(db, soulId);
		refresh();
		toast(`${soul.name} awakened from dormancy.`);
	};

	return (
		<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
			<ActionButton variant="primary" onClick={() => navigate(`/observe`)}>
				Observe
			</ActionButton>
			<ActionButton
				variant="success"
				onClick={() => navigate(`/soul/${soulId}/refine`)}
				disabled={!profile.crystallizationReady && profile.pendingShardCount === 0}
			>
				Refine
			</ActionButton>
			<ActionButton
				variant="warn"
				onClick={() => navigate(`/soul/${soulId}/levelup`)}
				disabled={!profile.atCapacity}
			>
				Level Up
			</ActionButton>
			{soul.isDormant ? (
				<ActionButton variant="muted" onClick={handleAwaken}>
					Awaken
				</ActionButton>
			) : confirmRetire ? (
				<ConfirmDialog
					message={`Retire ${soul.name}?`}
					onConfirm={handleRetire}
					onCancel={() => setConfirmRetire(false)}
				/>
			) : (
				<ActionButton variant="danger" onClick={() => setConfirmRetire(true)}>
					Retire
				</ActionButton>
			)}
		</div>
	);
}
