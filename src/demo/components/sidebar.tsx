import { useState } from 'preact/hooks';
import * as read from '../../read.ts';
import { useLiveData } from '../hooks.ts';
import { navigate, useRoute } from '../router.tsx';
import { loadSeeds } from '../seed.ts';
import { useAppState } from '../state.tsx';

export function Sidebar() {
	const { db, refresh, toast, guidesOpen, toggleGuides } = useAppState();
	const { path } = useRoute();
	const [open, setOpen] = useState(false);

	const stats = useLiveData(() => {
		const souls = read.listSouls(db);
		const readiness = read.crystallizationReadiness(db);
		return { soulCount: souls.length, readyCount: readiness.length };
	}, []);

	const go = (route: string) => {
		navigate(route);
		setOpen(false);
	};

	const isActive = (route: string) => {
		if (route === '/') return path === '/';
		return path.startsWith(route);
	};

	const handleReset = () => {
		db.exec('DELETE FROM shard_tags');
		db.exec('DELETE FROM shard_citations');
		db.exec('DELETE FROM shard_souls');
		db.exec('DELETE FROM soul_shards');
		db.exec('DELETE FROM soul_levels');
		db.exec('DELETE FROM soul_traits');
		db.exec('DELETE FROM souls');
		try {
			db.exec('DELETE FROM shard_fts');
		} catch {}
		refresh();
		toast('Database reset to empty state.');
	};

	const handleSeed = () => {
		handleReset();
		loadSeeds(db);
		refresh();
		toast('Loaded "The Atelier" seed scenario with 4 souls.');
	};

	const navItems = [
		{ route: '/', icon: '#', label: 'Roster', badge: stats.soulCount || undefined },
		{ route: '/create', icon: '+', label: 'Create Soul' },
		{ route: '/observe', icon: '*', label: 'Observe' },
		{
			route: '/maintenance',
			icon: '~',
			label: 'Maintenance',
			badge: stats.readyCount || undefined,
		},
		{ route: '/search', icon: '?', label: 'Search' },
		{ route: '/ether', icon: '~', label: 'The Ether' },
	];

	return (
		<>
			<button type="button" class="hamburger" onClick={() => setOpen(!open)}>
				{open ? 'x' : '='}
			</button>
			{open && (
				<button
					type="button"
					class="sidebar-backdrop"
					tabIndex={-1}
					onClick={() => setOpen(false)}
					aria-label="Close sidebar"
				/>
			)}
			<nav class={`sidebar ${open ? 'sidebar-open' : ''}`}>
				<div class="sidebar-brand">
					<div class="sidebar-logo">S</div>
					<div class="sidebar-title">SOUL WORKSHOP</div>
				</div>
				<div class="sidebar-nav">
					{navItems.map((item) => (
						<button
							type="button"
							key={item.route}
							class={`nav-item ${isActive(item.route) ? 'nav-active' : ''}`}
							onClick={() => go(item.route)}
						>
							<span class="nav-icon">{item.icon}</span>
							<span class="nav-label">{item.label}</span>
							{item.badge !== undefined && <span class="nav-badge">{item.badge}</span>}
						</button>
					))}
				</div>
				<div class="sidebar-footer">
					<div class="sidebar-btn-row">
						<button type="button" class="btn btn-sm btn-muted" onClick={handleSeed}>
							Load Seeds
						</button>
						<button type="button" class="btn btn-sm btn-danger" onClick={handleReset}>
							Reset DB
						</button>
					</div>
					<button type="button" class="btn btn-sm btn-muted" onClick={toggleGuides}>
						{guidesOpen ? 'Hide Guides' : 'Show Guides'}
					</button>
				</div>
			</nav>
		</>
	);
}
