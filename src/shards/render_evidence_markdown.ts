import type { EvidenceReport } from './types.ts';

export function renderEvidenceMarkdown(report: EvidenceReport): string {
	const lines: string[] = [];

	lines.push(`# Evidence Report`);
	lines.push('');
	lines.push(
		`**Soul ID:** ${report.soulId} · **Pending shards:** ${report.pendingCount} · **Velocity:** ${(report.shardVelocity * 100).toFixed(1)}%`,
	);
	lines.push('');

	if (report.suggestedActions.length > 0) {
		lines.push(`## Suggested Actions`);
		lines.push('');
		for (const action of report.suggestedActions) {
			lines.push(`- ${action}`);
		}
		lines.push('');
	}

	if (report.clusters.length > 0) {
		lines.push(`## Evidence Clusters (${report.clusters.length})`);
		lines.push('');
		for (let i = 0; i < report.clusters.length; i++) {
			const cluster = report.clusters[i];
			if (!cluster) continue;

			const alignLabel =
				cluster.alignment.kind === 'reinforcing'
					? ` · reinforcing trait #${cluster.alignment.traitId}`
					: ` · novel`;

			lines.push(`### Cluster ${i + 1} — weight ${cluster.weight.toFixed(2)}${alignLabel}`);
			lines.push(
				`*${cluster.members.length} shard${cluster.members.length === 1 ? '' : 's'} · ${cluster.sourceDiversity} source(s) · freshness ${(cluster.avgFreshness * 100).toFixed(1)}%*`,
			);

			if (cluster.sharedWith.length > 0) {
				const shared = cluster.sharedWith
					.map((o) => `soul #${o.soulId} (${o.shardCount} shared)`)
					.join(', ');
				lines.push(`*Also attributed to: ${shared}*`);
			}

			lines.push('');
			for (const shard of cluster.members) {
				lines.push(`- ${shard.content} *(${shard.source})*`);
			}
			lines.push('');
		}
	}

	if (report.traitSignals.length > 0) {
		lines.push(`## Trait Signals`);
		lines.push('');
		lines.push('| Trait | Citations | Density | Redundancy | Stale |');
		lines.push('|-------|-----------|---------|------------|-------|');
		for (const sig of report.traitSignals) {
			lines.push(
				`| ${sig.principle} | ${sig.citationCount} | ${sig.citationDensity.toFixed(3)} | ${(sig.essenceRedundancy * 100).toFixed(1)}% | ${sig.stale ? 'yes' : 'no'} |`,
			);
		}
		lines.push('');
	}

	if (report.tensions.length > 0) {
		lines.push(`## Detected Tensions`);
		lines.push('');
		for (const tension of report.tensions) {
			lines.push(`- ${tension.description}`);
		}
		lines.push('');
	}

	if (report.consolidationSuggestions.length > 0) {
		lines.push(`## Consolidation Suggestions`);
		lines.push('');
		for (const sug of report.consolidationSuggestions) {
			lines.push(
				`- [similarity: ${(sug.similarity * 100).toFixed(1)}%] ${sug.principles.join(' | ')}`,
			);
		}
		lines.push('');
	}

	if (report.promotionCandidates.length > 0) {
		lines.push(`## Promotion Candidates`);
		lines.push('');
		for (const cand of report.promotionCandidates) {
			lines.push(`- [score: ${cand.score.toFixed(4)}] ${cand.principle}`);
		}
		lines.push('');
	}

	return lines.join('\n');
}
