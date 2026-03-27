import { useState } from 'preact/hooks';
import * as read from '../../read.ts';
import type { ShardRecord } from '../../shards/types.ts';
import type { TraitRecord } from '../../traits/types.ts';
import * as write from '../../write.ts';
import { Explainer } from '../components/explainer.tsx';
import { Panel } from '../components/panel.tsx';
import { useDb } from '../hooks.ts';
import { useAppState } from '../state.tsx';

interface RefineActionsProps {
	soulId: number;
}

export function RefineActions({ soulId }: RefineActionsProps) {
	const db = useDb();
	const { refresh, toast } = useAppState();
	const [tab, setTab] = useState<'add' | 'revise' | 'revert' | 'cite'>('add');

	const [principle, setPrinciple] = useState('');
	const [provenance, setProvenance] = useState('');

	const [selectedTraitId, setSelectedTraitId] = useState<number | null>(null);
	const [revisePrinciple, setRevisePrinciple] = useState('');
	const [reviseProvenance, setReviseProvenance] = useState('');

	const [citeShardId, setCiteShardId] = useState<number | null>(null);
	const [citeTraitId, setCiteTraitId] = useState<number | null>(null);

	const traits: TraitRecord[] = read.listTraits(db, soulId, { status: 'active' });
	const shards: ShardRecord[] = read.listShards(db, { soulId, limit: 50 });
	const soul = read.getSoul(db, soulId);

	const handleAdd = () => {
		try {
			const _t = write.addTrait(db, soulId, { principle, provenance });
			const profile = read.getSoulProfile(db, soulId);
			toast(
				`Added trait to ${soul?.name ?? 'soul'}. ${profile.activeTraitCount} of ${profile.traitLimit} active trait slots used.`,
			);
			refresh();
			setPrinciple('');
			setProvenance('');
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Failed to add trait.', 'err');
		}
	};

	const handleRevise = () => {
		if (!selectedTraitId) return;
		try {
			write.reviseTrait(db, selectedTraitId, {
				principle: revisePrinciple || undefined,
				provenance: reviseProvenance || undefined,
			});
			toast(`Revised trait #${selectedTraitId} for ${soul?.name ?? 'soul'}.`);
			refresh();
			setSelectedTraitId(null);
			setRevisePrinciple('');
			setReviseProvenance('');
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Failed to revise trait.', 'err');
		}
	};

	const handleRevert = () => {
		if (!selectedTraitId) return;
		try {
			write.revertTrait(db, selectedTraitId);
			toast(`Reverted trait #${selectedTraitId} from ${soul?.name ?? 'soul'}.`);
			refresh();
			setSelectedTraitId(null);
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Failed to revert trait.', 'err');
		}
	};

	const handleCite = () => {
		if (!citeShardId || !citeTraitId) return;
		try {
			write.citeShard(db, citeShardId, citeTraitId);
			toast(`Cited shard #${citeShardId} as evidence for trait #${citeTraitId}.`);
			refresh();
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Failed to cite shard.', 'err');
		}
	};

	const handleStamp = () => {
		try {
			write.stampAttuned(db, soulId);
			toast(`Stamped ${soul?.name ?? 'soul'} as freshly attuned.`);
			refresh();
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Failed to stamp.', 'err');
		}
	};

	return (
		<Panel title="Actions">
			<Explainer id="refine/actions" />
			<div class="tab-row">
				{(['add', 'revise', 'revert', 'cite'] as const).map((t) => (
					<button
						type="button"
						key={t}
						class={`tab-btn ${tab === t ? 'tab-active' : ''}`}
						onClick={() => setTab(t)}
					>
						{t === 'add'
							? 'Add Trait'
							: t === 'revise'
								? 'Revise'
								: t === 'revert'
									? 'Revert'
									: 'Cite'}
					</button>
				))}
			</div>

			{tab === 'add' && (
				<div style={{ display: 'grid', gap: 12 }}>
					<div class="form-field">
						<span class="form-label">Principle</span>
						<textarea
							class="textarea"
							rows={2}
							value={principle}
							onInput={(e) => setPrinciple((e.target as HTMLTextAreaElement).value)}
							placeholder="The behavioral rule..."
						/>
					</div>
					<div class="form-field">
						<span class="form-label">Provenance</span>
						<textarea
							class="textarea"
							rows={2}
							value={provenance}
							onInput={(e) => setProvenance((e.target as HTMLTextAreaElement).value)}
							placeholder="Why this was added..."
						/>
					</div>
					<button
						type="button"
						class="btn btn-primary"
						onClick={handleAdd}
						disabled={!principle.trim() || !provenance.trim()}
					>
						Add Trait
					</button>
				</div>
			)}

			{tab === 'revise' && (
				<div style={{ display: 'grid', gap: 12 }}>
					<div class="form-field">
						<span class="form-label">Select trait</span>
						<div style={{ display: 'grid', gap: 4 }}>
							{traits.map((t) => (
								<button
									type="button"
									key={t.id}
									class={`check-row ${selectedTraitId === t.id ? 'accent-text' : ''}`}
									onClick={() => {
										setSelectedTraitId(t.id);
										setRevisePrinciple(t.principle);
										setReviseProvenance(t.provenance);
									}}
								>
									<span class={`check-box ${selectedTraitId === t.id ? 'check-box-on' : ''}`}>
										{selectedTraitId === t.id ? '+' : ''}
									</span>
									<span style={{ fontSize: '0.85rem' }}>{t.principle}</span>
								</button>
							))}
						</div>
					</div>
					{selectedTraitId && (
						<>
							<div class="form-field">
								<span class="form-label">New Principle</span>
								<textarea
									class="textarea"
									rows={2}
									value={revisePrinciple}
									onInput={(e) => setRevisePrinciple((e.target as HTMLTextAreaElement).value)}
								/>
							</div>
							<div class="form-field">
								<span class="form-label">New Provenance</span>
								<textarea
									class="textarea"
									rows={2}
									value={reviseProvenance}
									onInput={(e) => setReviseProvenance((e.target as HTMLTextAreaElement).value)}
								/>
							</div>
							<button type="button" class="btn btn-warn" onClick={handleRevise}>
								Revise Trait
							</button>
						</>
					)}
				</div>
			)}

			{tab === 'revert' && (
				<div style={{ display: 'grid', gap: 12 }}>
					<div class="form-field">
						<span class="form-label">Select trait to revert</span>
						<div style={{ display: 'grid', gap: 4 }}>
							{traits.map((t) => (
								<button
									type="button"
									key={t.id}
									class={`check-row ${selectedTraitId === t.id ? 'accent-text' : ''}`}
									onClick={() => setSelectedTraitId(t.id)}
								>
									<span class={`check-box ${selectedTraitId === t.id ? 'check-box-on' : ''}`}>
										{selectedTraitId === t.id ? '+' : ''}
									</span>
									<span style={{ fontSize: '0.85rem' }}>{t.principle}</span>
								</button>
							))}
						</div>
					</div>
					{selectedTraitId && (
						<button type="button" class="btn btn-danger" onClick={handleRevert}>
							Revert Trait
						</button>
					)}
				</div>
			)}

			{tab === 'cite' && (
				<div style={{ display: 'grid', gap: 12 }}>
					<div class="form-field">
						<span class="form-label">Select shard</span>
						<div style={{ display: 'grid', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
							{shards.map((s) => (
								<button
									type="button"
									key={s.id}
									class={`check-row ${citeShardId === s.id ? 'accent-text' : ''}`}
									onClick={() => setCiteShardId(s.id)}
								>
									<span class={`check-box ${citeShardId === s.id ? 'check-box-on' : ''}`}>
										{citeShardId === s.id ? '+' : ''}
									</span>
									<span
										style={{
											fontSize: '0.82rem',
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
										}}
									>
										{s.content.slice(0, 80)}
										{s.content.length > 80 ? '...' : ''}
									</span>
								</button>
							))}
						</div>
					</div>
					<div class="form-field">
						<span class="form-label">Select trait</span>
						<div style={{ display: 'grid', gap: 4 }}>
							{traits.map((t) => (
								<button
									type="button"
									key={t.id}
									class={`check-row ${citeTraitId === t.id ? 'accent-text' : ''}`}
									onClick={() => setCiteTraitId(t.id)}
								>
									<span class={`check-box ${citeTraitId === t.id ? 'check-box-on' : ''}`}>
										{citeTraitId === t.id ? '+' : ''}
									</span>
									<span style={{ fontSize: '0.85rem' }}>{t.principle}</span>
								</button>
							))}
						</div>
					</div>
					<button
						type="button"
						class="btn btn-primary"
						onClick={handleCite}
						disabled={!citeShardId || !citeTraitId}
					>
						Cite Shard
					</button>
				</div>
			)}

			<div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
				<button type="button" class="btn btn-muted" onClick={handleStamp}>
					Stamp Attunement
				</button>
			</div>
		</Panel>
	);
}
