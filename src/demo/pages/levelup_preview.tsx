import { useState } from 'preact/hooks';
import type { LevelUpPlan } from '../../levels/types.ts';
import * as read from '../../read.ts';
import * as write from '../../write.ts';
import { ConfirmDialog } from '../components/confirm_dialog.tsx';
import { Panel } from '../components/panel.tsx';
import { useDb, useLiveData } from '../hooks.ts';
import { navigate } from '../router.tsx';
import { useAppState } from '../state.tsx';

interface LevelUpPreviewProps {
	soulId: number;
	plan: LevelUpPlan | null;
}

export function LevelUpPreview({ soulId, plan }: LevelUpPreviewProps) {
	const db = useDb();
	const { refresh, toast } = useAppState();
	const [executed, setExecuted] = useState(false);
	const [confirmRevert, setConfirmRevert] = useState(false);

	const soul = useLiveData(() => read.getSoul(db, soulId), [soulId]);

	if (!plan) {
		return (
			<Panel title="Preview" subtitle="Build a plan above to preview the result">
				<p class="muted">Assign all traits and fill in the new essence to build a plan.</p>
			</Panel>
		);
	}

	const validation = read.validateLevelUpPlan(db, soulId, plan);

	const handleExecute = () => {
		try {
			const result = write.levelUp(db, soulId, plan);
			const consolCount = plan.consolidations.reduce((s, g) => s + g.sourceTraitIds.length, 0);
			toast(
				`Level-up executed: ${soul?.name ?? 'Soul'} is now Level ${result.level}. ` +
					`${consolCount} traits consolidated, ${plan.promotedTraitIds.length} promoted.`,
			);
			refresh();
			setExecuted(true);
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Failed to execute level-up.', 'err');
		}
	};

	const handleRevert = () => {
		try {
			write.revertLevelUp(db, soulId);
			toast(`Level-up reverted for ${soul?.name ?? 'Soul'}.`);
			refresh();
			setExecuted(false);
			setConfirmRevert(false);
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Failed to revert level-up.', 'err');
		}
	};

	return (
		<Panel title="Preview & Execute">
			{!validation.valid && validation.error && (
				<div class="confirm-inline" style={{ marginBottom: 12 }}>
					<span style={{ fontSize: '0.85rem' }}>
						Plan invalid:
						{validation.error.missingTraitIds.length > 0 &&
							` Missing: [${validation.error.missingTraitIds}].`}
						{validation.error.duplicateTraitIds.length > 0 &&
							` Duplicates: [${validation.error.duplicateTraitIds}].`}
						{validation.error.invalidTraitIds.length > 0 &&
							` Invalid: [${validation.error.invalidTraitIds}].`}
					</span>
				</div>
			)}

			<div class="form-field">
				<span class="form-label">New Essence Preview</span>
				<pre class="identity-block">{plan.newEssence}</pre>
			</div>

			<div style={{ display: 'grid', gap: 8 }}>
				<div class="muted" style={{ fontSize: '0.82rem' }}>
					{plan.consolidations.length} consolidation group
					{plan.consolidations.length !== 1 ? 's' : ''}, {plan.promotedTraitIds.length} promoted,{' '}
					{plan.carriedTraitIds.length} carried
				</div>
			</div>

			<div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
				{!executed ? (
					<button
						type="button"
						class="btn btn-primary"
						onClick={handleExecute}
						disabled={!validation.valid}
					>
						Execute Level-Up
					</button>
				) : confirmRevert ? (
					<ConfirmDialog
						message="Revert this level-up? This undoes the consolidation."
						onConfirm={handleRevert}
						onCancel={() => setConfirmRevert(false)}
					/>
				) : (
					<>
						<div class="badge badge-success celebrate">Level-up complete</div>
						<button
							type="button"
							class="btn btn-sm btn-danger"
							onClick={() => setConfirmRevert(true)}
						>
							Revert
						</button>
						<button
							type="button"
							class="btn btn-sm btn-primary"
							onClick={() => navigate(`/soul/${soulId}`)}
						>
							View Soul
						</button>
					</>
				)}
			</div>
		</Panel>
	);
}
