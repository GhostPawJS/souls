import * as read from '../../read.ts';
import { EmptyState } from '../components/empty_state.tsx';
import { Explainer } from '../components/explainer.tsx';
import { SoulCard } from '../components/soul_card.tsx';
import { useDb, useLiveData } from '../hooks.ts';
import { navigate } from '../router.tsx';
import { loadSeeds } from '../seed.ts';
import { useAppState } from '../state.tsx';

export function Roster() {
	const db = useDb();
	const { refresh, toast } = useAppState();

	const { active, dormant } = useLiveData(() => {
		const souls = read.listSouls(db);
		const dormantSouls = read.listDormantSouls(db);
		const readiness = read.crystallizationReadiness(db);
		const readySet = new Set(readiness.map((r) => r.soulId));

		const profiles = souls.map((soul) => ({
			soul,
			profile: read.getSoulProfile(db, soul.id),
			readyScore: readySet.has(soul.id)
				? (readiness.find((r) => r.soulId === soul.id)?.priorityScore ?? 0)
				: -1,
		}));

		profiles.sort((a, b) => b.readyScore - a.readyScore);

		const dormantProfiles = dormantSouls.map((soul) => ({
			soul,
			profile: read.getSoulProfile(db, soul.id),
		}));

		return { active: profiles, dormant: dormantProfiles };
	}, []);

	const isEmpty = active.length === 0 && dormant.length === 0;

	const handleSeed = () => {
		loadSeeds(db);
		refresh();
		toast('Loaded "The Atelier" seed scenario with 4 souls.');
	};

	return (
		<>
			<h1 class="page-title">Roster</h1>
			<Explainer id="roster" />
			{isEmpty ? (
				<EmptyState
					glyph="S"
					title="No souls yet"
					subtitle="Create your first identity or load the demo seeds to explore."
				>
					<div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
						<button type="button" class="btn btn-primary" onClick={() => navigate('/create')}>
							Create Soul
						</button>
						<button type="button" class="btn btn-muted" onClick={handleSeed}>
							Load Seeds
						</button>
					</div>
				</EmptyState>
			) : (
				<>
					<div class="soul-grid">
						{active.map(({ soul, profile }) => (
							<SoulCard key={soul.id} soul={soul} profile={profile} />
						))}
					</div>
					{dormant.length > 0 && (
						<>
							<h2 style={{ marginTop: 12 }}>Dormant</h2>
							<div class="soul-grid">
								{dormant.map(({ soul, profile }) => (
									<SoulCard key={soul.id} soul={soul} profile={profile} />
								))}
							</div>
						</>
					)}
				</>
			)}
		</>
	);
}
