import type { SoulsDb } from '../database.ts';
import { resolveNow } from '../resolve_now.ts';
import { getSoulOrThrow } from '../souls/get_soul_or_throw.ts';
import { clusterShards } from './cluster_shards.ts';
import { computeCrossSoulOverlap } from './compute_cross_soul_overlap.ts';
import { computePromotionCandidates } from './compute_promotion_candidates.ts';
import { computeShardVelocity } from './compute_shard_velocity.ts';
import { computeSuggestedActions } from './compute_suggested_actions.ts';
import { computeTraitAlignment } from './compute_trait_alignment.ts';
import { computeTraitSignals } from './compute_trait_signals.ts';
import { detectTraitTensions } from './detect_trait_tensions.ts';
import { listShards } from './list_shards.ts';
import { renderEvidenceMarkdown } from './render_evidence_markdown.ts';
import { searchShards } from './search_shards.ts';
import { suggestConsolidations } from './suggest_consolidations.ts';
import type { EvidenceReport, FormatEvidenceOptions } from './types.ts';

const DEFAULT_TRAIT_LIMIT = 10;

export function formatEvidence(
	db: SoulsDb,
	soulId: number,
	options?: FormatEvidenceOptions,
): EvidenceReport {
	getSoulOrThrow(db, soulId);
	const now = resolveNow(options?.now);

	// Get the shard pool — scoped by query, tags, and expiry as requested
	const shards = options?.query
		? searchShards(db, options.query, {
				soulId,
				shardExpiryDays: options.shardExpiryDays,
				now,
			})
		: listShards(db, {
				soulId,
				tags: options?.tags,
				shardExpiryDays: options?.shardExpiryDays,
				now,
			});

	const pendingCount = shards.length;

	const clusterOpts: { threshold?: number; now?: number } = { now };
	if (options?.clusterThreshold !== undefined) clusterOpts.threshold = options.clusterThreshold;
	const rawClusters = clusterShards(shards, clusterOpts);
	const sortedClusters = rawClusters.sort((a, b) => b.weight - a.weight);

	// Compute alignment and cross-soul overlap per cluster
	const alignments = computeTraitAlignment(db, soulId, sortedClusters);
	const crossSoulOverlaps = computeCrossSoulOverlap(db, soulId, sortedClusters);

	// Attach alignment and sharedWith to each cluster
	const clusters = sortedClusters.map((cluster, i) => ({
		...cluster,
		alignment: alignments[i] ?? { kind: 'novel' as const },
		sharedWith: crossSoulOverlaps[i] ?? [],
	}));

	const traitSignalOptions: { staleDays?: number; now?: number } = { now };
	if (options?.staleDays !== undefined) traitSignalOptions.staleDays = options.staleDays;
	const traitSignals = computeTraitSignals(db, soulId, traitSignalOptions);
	const tensions = detectTraitTensions(traitSignals);
	const consolidationSuggestions = suggestConsolidations(traitSignals);
	const promotionCandidates = computePromotionCandidates(traitSignals);
	const shardVelocity = computeShardVelocity(db, soulId, now);

	const suggestedActions = computeSuggestedActions({
		traitSignals,
		clusters,
		consolidationSuggestions,
		promotionCandidates,
		traitLimit: DEFAULT_TRAIT_LIMIT,
	});

	const report: EvidenceReport = {
		soulId,
		pendingCount,
		clusters,
		traitSignals,
		tensions,
		consolidationSuggestions,
		promotionCandidates,
		suggestedActions,
		shardVelocity,
		renderedMarkdown: '',
	};

	report.renderedMarkdown = renderEvidenceMarkdown(report);
	return report;
}
