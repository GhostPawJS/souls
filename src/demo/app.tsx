import type { VNode } from 'preact';
import { Sidebar } from './components/sidebar.tsx';
import { ToastStack } from './components/toast.tsx';
import { Create } from './pages/create.tsx';
import { Ether } from './pages/ether.tsx';
import { EtherDetail } from './pages/ether_detail.tsx';
import { LevelUp } from './pages/levelup.tsx';
import { Maintenance } from './pages/maintenance.tsx';
import { Observe } from './pages/observe.tsx';
import { Refine } from './pages/refine.tsx';
import { Roster } from './pages/roster.tsx';
import { Search } from './pages/search.tsx';
import { SoulDetail } from './pages/soul_detail.tsx';
import { matchRoute, useRoute } from './router.tsx';

function resolvePage(path: string): VNode {
	const refineParams = matchRoute(path, '/soul/:id/refine');
	if (refineParams) return <Refine soulId={Number(refineParams.id)} />;

	const levelupParams = matchRoute(path, '/soul/:id/levelup');
	if (levelupParams) return <LevelUp soulId={Number(levelupParams.id)} />;

	const detailParams = matchRoute(path, '/soul/:id');
	if (detailParams) return <SoulDetail soulId={Number(detailParams.id)} />;

	const etherDetailParams = matchRoute(path, '/ether/:id');
	if (etherDetailParams) return <EtherDetail entryId={Number(etherDetailParams.id)} />;

	if (matchRoute(path, '/ether')) return <Ether />;
	if (matchRoute(path, '/observe')) return <Observe />;
	if (matchRoute(path, '/maintenance')) return <Maintenance />;
	if (matchRoute(path, '/search')) return <Search />;
	if (matchRoute(path, '/create')) return <Create />;

	return <Roster />;
}

export function App() {
	const { path } = useRoute();
	const page = resolvePage(path);

	return (
		<>
			<Sidebar />
			<main class="main-content">
				<div class="page">{page}</div>
			</main>
			<ToastStack />
		</>
	);
}
