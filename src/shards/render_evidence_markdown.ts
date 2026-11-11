import type { EvidenceReport } from './types.ts';

export function renderEvidenceMarkdown(
	report: EvidenceReport,
	options?: { maxMembersPerCluster?: number | undefined },
): string {
	const lines: string[] = [];
	const section = (title: string, items: string[]) => {
		if (items.length) lines.push(`## ${title}`, '', ...items, '');
	};

	lines.push(`# Evidence Report`);
	lines.push('');
	lines.push(
		`**Soul ID:** ${report.soulId} · **Pending shards:** ${report.pendingCount} · **Velocity:** ${(report.shardVelocity * 100).toFixed(1)}%`,
	);
	lines.push('');

	section(
		'Suggested Actions',
		report.suggestedActions.map((action) => `- ${action}`),
	);

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
				`*${cluster.totalMembers ?? cluster.members.length} shard${(cluster.totalMembers ?? cluster.members.length) === 1 ? '' : 's'} · ${cluster.sourceDiversity} source(s) · freshness ${(cluster.avgFreshness * 100).toFixed(1)}%*`,
			);

			if (cluster.sharedWith.length > 0) {
				const shared = cluster.sharedWith
					.map((o) => `soul #${o.soulId} (${o.shardCount} shared)`)
					.join(', ');
				lines.push(`*Also attributed to: ${shared}*`);
			}

			lines.push('');
			for (const shard of cluster.members.slice(
				0,
				Math.max(0, options?.maxMembersPerCluster ?? 5),
			)) {
				lines.push(`- ${shard.content} *(${shard.source})*`);
				for (const trace of shard.traces ?? [])
					lines.push(`  backs: trace #${trace.id} (${trace.state})`);
			}
			const remaining =
				(cluster.totalMembers ?? cluster.members.length) -
				Math.min(cluster.members.length, Math.max(0, options?.maxMembersPerCluster ?? 5));
			if (remaining > 0) lines.push(`+${remaining} more`);
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

	section(
		'Detected Tensions',
		report.tensions.map((tension) => `- ${tension.description}`),
	);
	section(
		'Consolidation Suggestions',
		report.consolidationSuggestions.map(
			(sug) =>
				`- [similarity: ${(sug.similarity * 100).toFixed(1)}%] ${sug.principles.join(' | ')}`,
		),
	);
	section(
		'Promotion Candidates',
		report.promotionCandidates.map(
			(cand) => `- [score: ${cand.score.toFixed(4)}] ${cand.principle}`,
		),
	);

	return lines.join('\n');
}
