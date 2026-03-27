import { useState } from 'preact/hooks';
import type { MaintenanceResult } from '../../maintenance.ts';
import * as read from '../../read.ts';
import type { CrystallizationRecord } from '../../shards/types.ts';
import { ConditionCheck } from '../components/condition_check.tsx';
import { EmptyState } from '../components/empty_state.tsx';
import { Explainer } from '../components/explainer.tsx';
import { Panel } from '../components/panel.tsx';
import { plural } from '../format.ts';
import { useDb } from '../hooks.ts';
import { navigate } from '../router.tsx';
import { useAppState } from '../state.tsx';

export function Maintenance() {
	const db = useDb();
	const { refresh, toast } = useAppState();
	const [result, setResult] = useState<MaintenanceResult | null>(null);

	const handleRun = () => {
		const r = read.runMaintenance(db);
		setResult(r);
		refresh();
		let msg = `Maintenance complete: ${plural(r.fadedShardCount, 'shard')} faded`;
		if (r.readySouls.length > 0) {
			msg += `, ${plural(r.readySouls.length, 'soul')} ready for refinement.`;
		} else {
			msg += '. No souls ready for refinement.';
		}
		toast(msg);
	};

	return (
		<>
			<h1 class="page-title">Maintenance</h1>
			<Explainer id="maintenance" />
			<Panel>
				<button type="button" class="btn btn-primary" onClick={handleRun}>
					Run Maintenance Pass
				</button>
			</Panel>
			{result && (
				<>
					<Panel title="Results">
						<div class="stat-grid">
							<div class="stat-card">
								<span class="stat-value">{result.fadedShardCount}</span>
								<span class="stat-label">Shards Faded</span>
								<span class="stat-sublabel">exhausted evidence removed</span>
							</div>
							<div class="stat-card">
								<span
									class="stat-value"
									style={{
										color:
											result.readySouls.length > 0 ? 'var(--success)' : 'var(--text-secondary)',
									}}
								>
									{result.readySouls.length}
								</span>
								<span class="stat-label">Ready Souls</span>
								<span class="stat-sublabel">for refinement</span>
							</div>
						</div>
					</Panel>
					{result.readySouls.length > 0 ? (
						result.readySouls.map((r) => <ReadySoulCard key={r.soulId} record={r} />)
					) : (
						<EmptyState
							glyph="~"
							title="All clear"
							subtitle="No souls currently need refinement."
						/>
					)}
				</>
			)}
		</>
	);
}

function ReadySoulCard({ record }: { record: CrystallizationRecord }) {
	const db = useDb();
	const soul = read.getSoul(db, record.soulId);
	const name = soul?.name ?? `Soul #${record.soulId}`;

	return (
		<Panel title={name} subtitle={`Priority score: ${record.priorityScore.toFixed(1)}`}>
			<ConditionCheck
				label="Shard count"
				pass={record.pendingCount >= 3}
				actual={record.pendingCount}
				required={3}
			/>
			<ConditionCheck
				label="Source diversity"
				pass={record.sourceDiversity >= 2}
				actual={record.sourceDiversity}
				required={2}
			/>
			<ConditionCheck
				label="Age spread (days)"
				pass={record.ageSpreadDays > 1}
				actual={record.ageSpreadDays.toFixed(1)}
				required=">1"
			/>
			<ConditionCheck
				label="Cluster diversity"
				pass={record.clusterCount >= 2}
				actual={record.clusterCount}
				required={2}
			/>
			<button
				type="button"
				class="btn btn-sm btn-success"
				onClick={() => navigate(`/soul/${record.soulId}/refine`)}
			>
				Go to Refinement
			</button>
		</Panel>
	);
}
