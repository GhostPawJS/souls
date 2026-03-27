import type { EvidenceReport } from '../../shards/types.ts';
import { Badge } from '../components/badge.tsx';
import { Explainer } from '../components/explainer.tsx';
import { Panel } from '../components/panel.tsx';

interface RefineEvidenceProps {
	report: EvidenceReport;
}

export function RefineEvidence({ report }: RefineEvidenceProps) {
	return (
		<div style={{ display: 'grid', gap: 16 }}>
			<Panel
				title="Evidence Report"
				subtitle={`${report.pendingCount} pending shards, ${report.clusters.length} clusters`}
			>
				<Explainer id="refine/evidence" />

				{report.clusters.map((cluster, i) => (
					<div key={i} class="trait-card">
						<div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
							<Badge variant="accent">Cluster {i + 1}</Badge>
							<Badge variant="muted">weight {cluster.weight.toFixed(2)}</Badge>
							<Badge variant={cluster.alignment.kind === 'reinforcing' ? 'success' : 'warn'}>
								{cluster.alignment.kind === 'reinforcing'
									? `reinforces trait #${cluster.alignment.traitId}`
									: 'novel pattern'}
							</Badge>
						</div>
						<div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
							{cluster.members.length} shards, {cluster.sourceDiversity} source
							{cluster.sourceDiversity !== 1 ? 's' : ''}
						</div>
						{cluster.members.slice(0, 3).map((m) => (
							<p
								key={m.id}
								style={{
									fontSize: '0.82rem',
									marginTop: 6,
									paddingLeft: 12,
									borderLeft: '2px solid var(--border)',
								}}
							>
								{m.content.length > 200 ? `${m.content.slice(0, 200)}...` : m.content}
							</p>
						))}
					</div>
				))}

				{report.traitSignals.length > 0 && (
					<div>
						<h3 style={{ marginBottom: 8 }}>Trait Signals</h3>
						{report.traitSignals.map((sig) => (
							<div key={sig.traitId} class="condition-row">
								<span class={`condition-icon ${sig.stale ? 'condition-fail' : 'condition-pass'}`}>
									{sig.stale ? '-' : '+'}
								</span>
								<span class="condition-label" style={{ fontSize: '0.82rem' }}>
									{sig.principle}
								</span>
								<span class="condition-value">{sig.citationCount} citations</span>
							</div>
						))}
					</div>
				)}

				{report.tensions.length > 0 && (
					<div>
						<h3 style={{ marginBottom: 8 }}>Tensions</h3>
						{report.tensions.map((t, i) => (
							<div key={i} class="confirm-inline" style={{ marginBottom: 6 }}>
								<span style={{ fontSize: '0.82rem' }}>{t.description}</span>
							</div>
						))}
					</div>
				)}

				{report.suggestedActions.length > 0 && (
					<div>
						<h3 style={{ marginBottom: 8 }}>Suggested Actions</h3>
						{report.suggestedActions.map((a, i) => (
							<p key={i} class="muted" style={{ fontSize: '0.85rem' }}>
								- {a}
							</p>
						))}
					</div>
				)}
			</Panel>
		</div>
	);
}
