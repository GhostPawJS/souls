import { useCallback, useState } from 'preact/hooks';
import { explainers } from '../explainers.ts';
import { useAppState } from '../state.tsx';

interface ExplainerProps {
	id: string;
}

const STORAGE_PREFIX = 'souls-explainer-';

function isCollapsed(id: string): boolean {
	try {
		return localStorage.getItem(STORAGE_PREFIX + id) === '0';
	} catch {
		return false;
	}
}

function setCollapsed(id: string, collapsed: boolean) {
	try {
		if (collapsed) {
			localStorage.setItem(STORAGE_PREFIX + id, '0');
		} else {
			localStorage.removeItem(STORAGE_PREFIX + id);
		}
	} catch {}
}

export function Explainer({ id }: ExplainerProps) {
	const { guidesOpen } = useAppState();
	const entry = explainers[id];
	if (!entry) return null;

	const [collapsed, setCollapsedState] = useState(() => isCollapsed(id));

	const showDetail = guidesOpen && !collapsed;

	const toggle = useCallback(() => {
		const next = !collapsed;
		setCollapsedState(next);
		setCollapsed(id, next);
	}, [collapsed, id]);

	if (!guidesOpen && collapsed) return null;

	return (
		<div class="explainer">
			<div>{entry.summary}</div>
			{showDetail && <div class="explainer-detail">{entry.detail}</div>}
			<button type="button" class="explainer-toggle" onClick={toggle}>
				{showDetail ? 'Hide details' : 'Show details'}
			</button>
		</div>
	);
}
