import { useState } from 'preact/hooks';
import type { ConsolidationGroup, LevelUpPlan } from '../../levels/types.ts';
import * as read from '../../read.ts';
import type { TraitRecord } from '../../traits/types.ts';
import { Badge } from '../components/badge.tsx';
import { Explainer } from '../components/explainer.tsx';
import { Panel } from '../components/panel.tsx';
import { useDb, useLiveData } from '../hooks.ts';

type Disposition = 'consolidate' | 'promote' | 'carry';

interface ConsolidationDraft {
	traitIds: number[];
	principle: string;
	provenance: string;
}

interface LevelUpPlannerProps {
	soulId: number;
	onPlanChange: (plan: LevelUpPlan | null) => void;
}

export function LevelUpPlanner({ soulId, onPlanChange }: LevelUpPlannerProps) {
	const db = useDb();
	const traits = useLiveData(() => read.listTraits(db, soulId, { status: 'active' }), [soulId]);
	const soul = useLiveData(() => read.getSoul(db, soulId), [soulId]);

	const [dispositions, setDispositions] = useState<Map<number, Disposition>>(new Map());
	const [consolidations, setConsolidations] = useState<ConsolidationDraft[]>([]);
	const [newEssence, setNewEssence] = useState(soul?.essence ?? '');

	const setDisposition = (traitId: number, disp: Disposition) => {
		setDispositions((prev) => {
			const next = new Map(prev);
			next.set(traitId, disp);
			return next;
		});
	};

	const consolidateTraits = [...traits.filter((t) => dispositions.get(t.id) === 'consolidate')];
	const promoteTraits = traits.filter((t) => dispositions.get(t.id) === 'promote');
	const carryTraits = traits.filter((t) => dispositions.get(t.id) === 'carry');
	const unassigned = traits.filter((t) => !dispositions.has(t.id));

	const updateConsolidation = (
		idx: number,
		field: keyof ConsolidationDraft,
		value: string | number[],
	) => {
		setConsolidations((prev) => {
			const next = [...prev];
			next[idx] = { ...next[idx], [field]: value };
			return next;
		});
	};

	const addConsolidationGroup = () => {
		setConsolidations((prev) => [...prev, { traitIds: [], principle: '', provenance: '' }]);
	};

	const toggleTraitInGroup = (groupIdx: number, traitId: number) => {
		setConsolidations((prev) => {
			const next = [...prev];
			const group = { ...next[groupIdx] };
			if (group.traitIds.includes(traitId)) {
				group.traitIds = group.traitIds.filter((id) => id !== traitId);
			} else {
				group.traitIds = [...group.traitIds, traitId];
			}
			next[groupIdx] = group;
			return next;
		});
	};

	const allAssigned = unassigned.length === 0;
	const validConsolidations = consolidations.every(
		(g) => g.traitIds.length >= 2 && g.principle.trim() && g.provenance.trim(),
	);
	const canBuild =
		allAssigned && (consolidateTraits.length === 0 || validConsolidations) && newEssence.trim();

	const buildPlan = (): LevelUpPlan | null => {
		if (!canBuild) return null;
		const groups: ConsolidationGroup[] = consolidations
			.filter((g) => g.traitIds.length >= 2)
			.map((g) => ({
				sourceTraitIds: g.traitIds,
				mergedPrinciple: g.principle,
				mergedProvenance: g.provenance,
			}));
		return {
			newEssence,
			consolidations: groups,
			promotedTraitIds: promoteTraits.map((t) => t.id),
			carriedTraitIds: carryTraits.map((t) => t.id),
		};
	};

	const handleBuildPlan = () => {
		onPlanChange(buildPlan());
	};

	return (
		<Panel title="Trait Disposition">
			<Explainer id="levelup/planner" />

			<div style={{ display: 'grid', gap: 8 }}>
				{traits.map((t) => (
					<TraitDispositionRow
						key={t.id}
						trait={t}
						disposition={dispositions.get(t.id)}
						onSelect={(d) => setDisposition(t.id, d)}
					/>
				))}
			</div>

			{consolidateTraits.length > 0 && (
				<div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
					<h3>Consolidation Groups</h3>
					{consolidations.map((group, idx) => (
						<div key={idx} class="trait-card" style={{ display: 'grid', gap: 8 }}>
							<div class="form-label">Group {idx + 1} - select 2+ traits</div>
							<div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
								{consolidateTraits.map((t) => (
									<button
										type="button"
										key={t.id}
										class={`pill-btn ${group.traitIds.includes(t.id) ? 'pill-active' : ''}`}
										onClick={() => toggleTraitInGroup(idx, t.id)}
									>
										{t.principle.slice(0, 40)}
										{t.principle.length > 40 ? '...' : ''}
									</button>
								))}
							</div>
							<div class="form-field">
								<span class="form-label">Merged Principle</span>
								<textarea
									class="textarea"
									rows={2}
									value={group.principle}
									onInput={(e) =>
										updateConsolidation(idx, 'principle', (e.target as HTMLTextAreaElement).value)
									}
								/>
							</div>
							<div class="form-field">
								<span class="form-label">Merged Provenance</span>
								<textarea
									class="textarea"
									rows={2}
									value={group.provenance}
									onInput={(e) =>
										updateConsolidation(idx, 'provenance', (e.target as HTMLTextAreaElement).value)
									}
								/>
							</div>
						</div>
					))}
					<button type="button" class="btn btn-sm btn-muted" onClick={addConsolidationGroup}>
						Add Group
					</button>
				</div>
			)}

			<div class="form-field" style={{ marginTop: 12 }}>
				<span class="form-label">New Essence</span>
				<textarea
					class="textarea"
					rows={4}
					value={newEssence}
					onInput={(e) => setNewEssence((e.target as HTMLTextAreaElement).value)}
					placeholder="The new core identity paragraph..."
				/>
			</div>

			<div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
				<button
					type="button"
					class="btn btn-primary"
					onClick={handleBuildPlan}
					disabled={!canBuild}
				>
					Build Plan
				</button>
				{!allAssigned && (
					<span class="muted" style={{ fontSize: '0.82rem', alignSelf: 'center' }}>
						{unassigned.length} trait{unassigned.length !== 1 ? 's' : ''} unassigned
					</span>
				)}
			</div>
		</Panel>
	);
}

function TraitDispositionRow({
	trait,
	disposition,
	onSelect,
}: {
	trait: TraitRecord;
	disposition?: Disposition;
	onSelect: (d: Disposition) => void;
}) {
	return (
		<div
			class="trait-card"
			style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}
		>
			<span style={{ flex: 1, fontSize: '0.85rem', minWidth: 120 }}>{trait.principle}</span>
			<div style={{ display: 'flex', gap: 4 }}>
				<button
					type="button"
					class={`pill-btn ${disposition === 'consolidate' ? 'pill-active' : ''}`}
					onClick={() => onSelect('consolidate')}
				>
					Consolidate
				</button>
				<button
					type="button"
					class={`pill-btn ${disposition === 'promote' ? 'pill-active' : ''}`}
					onClick={() => onSelect('promote')}
				>
					Promote
				</button>
				<button
					type="button"
					class={`pill-btn ${disposition === 'carry' ? 'pill-active' : ''}`}
					onClick={() => onSelect('carry')}
				>
					Carry
				</button>
			</div>
			{disposition && (
				<Badge
					variant={
						disposition === 'consolidate'
							? 'accent'
							: disposition === 'promote'
								? 'success'
								: 'muted'
					}
				>
					{disposition}
				</Badge>
			)}
		</div>
	);
}
