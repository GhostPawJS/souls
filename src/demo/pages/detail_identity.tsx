import * as read from '../../read.ts';
import { Explainer } from '../components/explainer.tsx';
import { Panel } from '../components/panel.tsx';
import { useDb, useLiveData } from '../hooks.ts';

export function DetailIdentity({ soulId }: { soulId: number }) {
	const db = useDb();

	const rendered = useLiveData(
		() => read.renderSoul(db, soulId, { includeProvenance: true }),
		[soulId],
	);

	return (
		<Panel title="Rendered Identity">
			<Explainer id="detail/identity" />
			<pre class="identity-block">{rendered}</pre>
		</Panel>
	);
}
