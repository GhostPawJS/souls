import { useState } from 'preact/hooks';
import * as read from '../../read.ts';
import * as write from '../../write.ts';
import { plural } from '../format.ts';
import { useDb, useLiveData } from '../hooks.ts';
import { useAppState } from '../state.tsx';

const SOURCES = [
	'session',
	'delegation',
	'manual_review',
	'user_feedback',
	'retrospective',
	'monitoring',
];

export function ObserveForm() {
	const db = useDb();
	const { refresh, toast } = useAppState();

	const souls = useLiveData(() => read.listSouls(db), []);

	const [content, setContent] = useState('');
	const [source, setSource] = useState('session');
	const [selectedSouls, setSelectedSouls] = useState<Set<number>>(new Set());
	const [tagInput, setTagInput] = useState('');
	const [sealed, setSealed] = useState(false);

	const toggleSoul = (id: number) => {
		setSelectedSouls((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const canSubmit = content.trim().length > 0 && selectedSouls.size > 0;

	const handleSubmit = () => {
		if (!canSubmit) return;
		try {
			const tags = tagInput
				.split(',')
				.map((t) => t.trim())
				.filter(Boolean);
			const soulIds = [...selectedSouls];
			const result = write.dropShard(db, { content, source, soulIds, tags, sealed });

			const soulNames = soulIds
				.map((id) => souls.find((s) => s.id === id)?.name ?? `#${id}`)
				.join(', ');

			let msg = `Deposited shard #${result.shard.id}, attributed to ${soulNames}.`;
			if (result.crystallizationTriggers.length > 0) {
				const names = result.crystallizationTriggers
					.map((id) => souls.find((s) => s.id === id)?.name ?? `#${id}`)
					.join(', ');
				msg += ` Crystallization triggered for ${names}.`;
			}
			toast(msg);
			refresh();
			setContent('');
			setTagInput('');
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Failed to deposit shard.', 'err');
		}
	};

	return (
		<div style={{ display: 'grid', gap: 16 }}>
			<div class="form-field">
				<span class="form-label">Observation</span>
				<textarea
					class="textarea"
					rows={4}
					placeholder="What behavioral pattern or outcome did you observe?"
					value={content}
					onInput={(e) => setContent((e.target as HTMLTextAreaElement).value)}
				/>
			</div>

			<div class="form-field">
				<span class="form-label">Source</span>
				<div class="pill-row">
					{SOURCES.map((s) => (
						<button
							type="button"
							key={s}
							class={`pill-btn ${source === s ? 'pill-active' : ''}`}
							onClick={() => setSource(s)}
						>
							{s}
						</button>
					))}
				</div>
			</div>

			<div class="form-field">
				<span class="form-label">Attribute to {plural(selectedSouls.size, 'soul')}</span>
				<div style={{ display: 'grid', gap: 4 }}>
					{souls.map((soul) => (
						<button
							type="button"
							key={soul.id}
							class="check-row"
							onClick={() => toggleSoul(soul.id)}
						>
							<span class={`check-box ${selectedSouls.has(soul.id) ? 'check-box-on' : ''}`}>
								{selectedSouls.has(soul.id) ? '+' : ''}
							</span>
							<span>{soul.name}</span>
						</button>
					))}
				</div>
			</div>

			<div class="form-field">
				<span class="form-label">Tags (comma-separated)</span>
				<input
					class="input"
					type="text"
					placeholder="e.g. architecture, communication"
					value={tagInput}
					onInput={(e) => setTagInput((e.target as HTMLInputElement).value)}
				/>
			</div>

			<div class="form-field">
				<button type="button" class="check-row" onClick={() => setSealed(!sealed)}>
					<span class={`check-box ${sealed ? 'check-box-on' : ''}`}>{sealed ? '+' : ''}</span>
					<span>Sealed (cannot be modified after deposit)</span>
				</button>
			</div>

			<button type="button" class="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
				Deposit Shard
			</button>
		</div>
	);
}
