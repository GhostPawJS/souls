import { useState } from 'preact/hooks';
import * as write from '../../write.ts';
import { Explainer } from '../components/explainer.tsx';
import { Panel } from '../components/panel.tsx';
import { useDb } from '../hooks.ts';
import { navigate } from '../router.tsx';
import { useAppState } from '../state.tsx';

export function Create() {
	const db = useDb();
	const { refresh, toast } = useAppState();
	const [name, setName] = useState('');
	const [essence, setEssence] = useState('');
	const [description, setDescription] = useState('');

	const canSubmit =
		name.trim().length > 0 && essence.trim().length > 0 && description.trim().length > 0;

	const handleCreate = () => {
		if (!canSubmit) return;
		try {
			const soul = write.createSoul(db, {
				name: name.trim(),
				essence: essence.trim(),
				description: description.trim(),
			});
			refresh();
			toast(`Created soul "${soul.name}" at Level 1.`);
			navigate(`/soul/${soul.id}`);
		} catch (err) {
			toast(err instanceof Error ? err.message : 'Failed to create soul.', 'err');
		}
	};

	return (
		<>
			<h1 class="page-title">Create Soul</h1>
			<Explainer id="create" />
			<Panel title="New Soul">
				<div class="form-field">
					<span class="form-label">Name</span>
					<input
						class="input"
						type="text"
						placeholder="e.g. Architect, Delegate, Scribe..."
						value={name}
						onInput={(e) => setName((e.target as HTMLInputElement).value)}
					/>
				</div>
				<div class="form-field">
					<span class="form-label">Essence</span>
					<textarea
						class="textarea"
						rows={4}
						placeholder="The core identity paragraph -- who this soul is and how it operates."
						value={essence}
						onInput={(e) => setEssence((e.target as HTMLTextAreaElement).value)}
					/>
				</div>
				<div class="form-field">
					<span class="form-label">Description</span>
					<input
						class="input"
						type="text"
						placeholder="Brief human-facing label for this soul."
						value={description}
						onInput={(e) => setDescription((e.target as HTMLInputElement).value)}
					/>
				</div>
				<button type="button" class="btn btn-primary" onClick={handleCreate} disabled={!canSubmit}>
					Create Soul
				</button>
			</Panel>
		</>
	);
}
