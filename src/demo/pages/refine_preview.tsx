import * as read from '../../read.ts';
import { Panel } from '../components/panel.tsx';
import { useDb, useLiveData } from '../hooks.ts';

export function RefinePreview({ soulId }: { soulId: number }) {
	const db = useDb();

	const rendered = useLiveData(() => read.renderSoul(db, soulId), [soulId]);

	return (
		<Panel
			title="Live Preview"
			subtitle="Current rendered identity as it would appear in a system prompt"
		>
			<pre class="identity-block">{rendered}</pre>
		</Panel>
	);
}
