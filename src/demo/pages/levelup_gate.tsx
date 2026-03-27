import * as read from '../../read.ts';
import { ConditionCheck } from '../components/condition_check.tsx';
import { Explainer } from '../components/explainer.tsx';
import { Panel } from '../components/panel.tsx';
import { useDb, useLiveData } from '../hooks.ts';

export function LevelUpGate({ soulId }: { soulId: number }) {
	const db = useDb();

	const check = useLiveData(() => {
		const readiness = read.crystallizationReadiness(db);
		return readiness.find((r) => r.soulId === soulId) ?? null;
	}, [soulId]);

	const profile = useLiveData(() => read.getSoulProfile(db, soulId), [soulId]);

	const isReady = check !== null;

	return (
		<Panel
			title="Crystallization Gate"
			subtitle={isReady ? 'All conditions met' : 'Conditions not yet met'}
		>
			<Explainer id="levelup/gate" />
			<ConditionCheck
				label="At trait capacity"
				pass={profile.atCapacity}
				actual={profile.activeTraitCount}
				required={profile.traitLimit}
			/>
			{check ? (
				<>
					<ConditionCheck
						label="Shard count"
						pass={true}
						actual={check.pendingCount}
						required={3}
					/>
					<ConditionCheck
						label="Source diversity"
						pass={true}
						actual={check.sourceDiversity}
						required={2}
					/>
					<ConditionCheck
						label="Age spread (days)"
						pass={true}
						actual={check.ageSpreadDays.toFixed(1)}
						required=">1"
					/>
					<ConditionCheck
						label="Cluster diversity"
						pass={true}
						actual={check.clusterCount}
						required={2}
					/>
				</>
			) : (
				<>
					<ConditionCheck
						label="Shard count"
						pass={profile.pendingShardCount >= 3}
						actual={profile.pendingShardCount}
						required={3}
					/>
					<ConditionCheck label="Crystallization ready" pass={false} actual="No" required="Yes" />
				</>
			)}
		</Panel>
	);
}
