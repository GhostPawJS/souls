import type { SoulsDb } from '../database.ts';
import { singleLinkageCluster } from '../lib/single_linkage_cluster.ts';
import { trigramJaccard } from '../lib/trigram_jaccard.ts';

const DEFAULT_CRYSTALLIZATION_THRESHOLD = 3;
const DEFAULT_CLUSTER_THRESHOLD = 0.5;
const DEFAULT_SHARD_EXPIRY_DAYS = 120;
const MS_PER_DAY = 86_400_000;
const MIN_SOURCE_DIVERSITY = 2;
const MIN_AGE_SPREAD_DAYS = 1;
const MIN_CLUSTER_DIVERSITY = 2;

export interface CrystallizationCheckOptions {
	crystallizationThreshold?: number | undefined;
	clusterThreshold?: number | undefined;
	shardExpiryDays?: number | undefined;
	now?: number | undefined;
}

export interface CrystallizationCheckResult {
	ready: boolean;
	reason?: string;
	pendingCount: number;
	sourceDiversity: number;
	ageSpreadDays: number;
	clusterCount: number;
	priorityScore: number;
}

interface ShardCandidate {
	id: number;
	content: string;
	source: string;
	created_at: number;
	occurred_at: number;
	inserted_at: number;
}

interface SoulMeta {
	last_attuned_at: number | null;
	deleted_at: number | null;
}

/**
 * 2-phase crystallization gate per CONCEPT.md:
 *
 * Phase 1 (cheap SQL pre-check): count, source diversity, age spread, recency
 * Phase 2 (expensive in-memory): cluster diversity
 *
 * Returns null if the soul is dormant or the pre-check fails without running clustering.
 */
export function checkCrystallizationForSoul(
	db: SoulsDb,
	soulId: number,
	options?: CrystallizationCheckOptions,
): CrystallizationCheckResult | null {
	const threshold = options?.crystallizationThreshold ?? DEFAULT_CRYSTALLIZATION_THRESHOLD;
	const clusterThreshold = options?.clusterThreshold ?? DEFAULT_CLUSTER_THRESHOLD;
	const expiryDays = options?.shardExpiryDays ?? DEFAULT_SHARD_EXPIRY_DAYS;
	const now = options?.now ?? Date.now();
	const expiryMs = now - expiryDays * MS_PER_DAY;

	// Skip dormant souls
	const soul = db
		.prepare(`SELECT last_attuned_at, deleted_at FROM souls WHERE id = ?`)
		.get<SoulMeta>(soulId);
	if (!soul || soul.deleted_at !== null) return null;

	// Phase 1: cheap SQL pre-checks
	const shards = db
		.prepare(
			`SELECT ss.id, ss.content, ss.source, COALESCE(ss.occurred_at,ss.created_at) AS created_at, COALESCE(ss.inserted_at,ss.created_at) AS inserted_at, COALESCE(ss.occurred_at,ss.created_at) AS occurred_at
			 FROM soul_shards ss
			 JOIN shard_souls sr ON sr.shard_id = ss.id
			 WHERE sr.soul_id = ?
			   AND ss.status = 'pending'
			   AND ss.sealed = 0
			   AND COALESCE(ss.occurred_at,ss.created_at) > ?`,
		)
		.all<ShardCandidate>(soulId, expiryMs);

	const pendingCount = shards.length;
	if (pendingCount < threshold) return null;

	// Condition: 2+ distinct source values (hardcoded invariant)
	const sources = new Set(shards.map((s) => s.source));
	const sourceDiversity = sources.size;

	// Condition: age spread > 1 day (hardcoded invariant)
	const timestamps = shards.map((s) => s.created_at);
	const oldest = Math.min(...timestamps);
	const newest = Math.max(...timestamps);
	const ageSpreadDays = (newest - oldest) / MS_PER_DAY;
	if (ageSpreadDays < MIN_AGE_SPREAD_DAYS) return null;

	const native = shards.filter((s) => s.occurred_at >= s.inserted_at);
	const nativeTimes = native.map((s) => s.occurred_at);
	const nativeSpread = nativeTimes.length ? Math.max(...nativeTimes) - Math.min(...nativeTimes) : 0;
	const crossSourceSpread = shards.some((a) =>
		shards.some(
			(b) => a.source !== b.source && Math.abs(a.occurred_at - b.occurred_at) >= MS_PER_DAY,
		),
	);
	if (nativeSpread < MS_PER_DAY && !crossSourceSpread)
		return {
			ready: false,
			reason: 'Age spread must span at least two sources by occurrence time.',
			pendingCount,
			sourceDiversity,
			ageSpreadDays,
			clusterCount: 0,
			priorityScore: 0,
		};
	if (sourceDiversity < MIN_SOURCE_DIVERSITY) return null;
	// Condition: at least one shard after lastAttunedAt (recency gate)
	const lastAttuned = soul.last_attuned_at ?? 0;
	const hasRecentShard = shards.some((s) => s.created_at > lastAttuned);
	if (!hasRecentShard) return null;

	// Phase 2: expensive in-memory cluster diversity check
	const clusters = singleLinkageCluster(
		shards.map((s) => s.content),
		trigramJaccard,
		clusterThreshold,
	);
	const clusterCount = clusters.length;
	if (clusterCount < MIN_CLUSTER_DIVERSITY) return null;

	// Priority: pendingCount × sourceDiversity × ageSpreadDays × recencyFactor
	const daysSinceLastAttuned = (now - lastAttuned) / MS_PER_DAY;
	const recencyFactor = 1 / Math.max(1, daysSinceLastAttuned);
	const priorityScore = pendingCount * sourceDiversity * ageSpreadDays * recencyFactor;

	return { ready: true, pendingCount, sourceDiversity, ageSpreadDays, clusterCount, priorityScore };
}
