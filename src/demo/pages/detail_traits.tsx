import * as read from '../../read.ts';
import { Explainer } from '../components/explainer.tsx';
import { Panel } from '../components/panel.tsx';
import { TraitCard } from '../components/trait_card.tsx';
import { useDb, useLiveData } from '../hooks.ts';

export function DetailTraits({ soulId }: { soulId: number }) {
	const db = useDb();

	const { traits, profile } = useLiveData(() => {
		const traits = read.listTraits(db, soulId, { status: 'active' });
		const profile = read.getSoulProfile(db, soulId);
		return { traits, profile };
	}, [soulId]);

	return (
		<Panel
			title="Active Traits"
			subtitle={`${profile.activeTraitCount} of ${profile.traitLimit} active traits`}
		>
			<Explainer id="detail/traits" />
			{traits.length === 0 ? (
				<p class="muted">No active traits yet. Add traits through refinement.</p>
			) : (
				traits.map((t) => <TraitCard key={t.id} trait={t} />)
			)}
		</Panel>
	);
}
