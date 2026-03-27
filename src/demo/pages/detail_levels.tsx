import * as read from '../../read.ts';
import { Explainer } from '../components/explainer.tsx';
import { LevelNode } from '../components/level_node.tsx';
import { Panel } from '../components/panel.tsx';
import { useDb, useLiveData } from '../hooks.ts';

export function DetailLevels({ soulId, currentLevel }: { soulId: number; currentLevel: number }) {
	const db = useDb();

	const history = useLiveData(() => read.getLevelHistory(db, soulId), [soulId]);

	return (
		<Panel title="Level History">
			<Explainer id="detail/levels" />
			{history.length === 0 ? (
				<p class="muted">No level-ups yet. This soul is still on its first generation.</p>
			) : (
				<div class="timeline">
					{history.map((record) => (
						<LevelNode key={record.id} record={record} isCurrent={record.level === currentLevel} />
					))}
				</div>
			)}
		</Panel>
	);
}
