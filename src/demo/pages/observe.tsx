import { Explainer } from '../components/explainer.tsx';
import { Panel } from '../components/panel.tsx';
import { ObserveFeed } from './observe_feed.tsx';
import { ObserveForm } from './observe_form.tsx';

export function Observe() {
	return (
		<>
			<h1 class="page-title">Observation Lab</h1>
			<Explainer id="observe" />
			<Panel title="Deposit Observation">
				<ObserveForm />
			</Panel>
			<ObserveFeed />
		</>
	);
}
