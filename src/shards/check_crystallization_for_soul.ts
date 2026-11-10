import { resolveReadiness } from '../config.ts';
import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { singleLinkageCluster } from '../lib/single_linkage_cluster.ts';
import { trigramJaccard } from '../lib/trigram_jaccard.ts';
import { traceEdges } from '../traces/trace_edges.ts';
import { traceTablesExist } from '../traces/trace_tables_exist.ts';

const DEFAULT_CRYSTALLIZATION_THRESHOLD = 3;
const DEFAULT_CLUSTER_THRESHOLD = 0.5;
const DEFAULT_SHARD_EXPIRY_DAYS = 120;
const MS_PER_DAY = 86_400_000;
const MIN_CLUSTER_DIVERSITY = 2;

export interface CrystallizationCheckOptions {
	readiness?: 'converged' | 'legacy' | undefined;
	minClusterSize?: number | undefined;
	minSourceDiversity?: number | undefined;
	minSpreadDays?: number | undefined;
	crystallizationThreshold?: number | undefined;
	clusterThreshold?: number | undefined;
	shardExpiryDays?: number | undefined;
	now?: number | undefined;
}

export interface CrystallizationCheckResult {
	convergedClusterCount?: number;
	largestClusterSize?: number;
	traceBackedCount?: number;
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
	created_at: number;
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
	const readiness = resolveReadiness(db, options?.readiness);
	const minClusterSize = options?.minClusterSize ?? 3;
	if (!Number.isSafeInteger(minClusterSize) || minClusterSize < 1)
		throw new SoulsValidationError('minClusterSize must be a positive integer');
	const threshold = options?.crystallizationThreshold ?? DEFAULT_CRYSTALLIZATION_THRESHOLD;
	const clusterThreshold = options?.clusterThreshold ?? DEFAULT_CLUSTER_THRESHOLD;
	const expiryDays = options?.shardExpiryDays ?? DEFAULT_SHARD_EXPIRY_DAYS;
	const now = options?.now ?? Date.now();
	const minSourceDiversity = options?.minSourceDiversity ?? 2;
	const minSpreadDays = options?.minSpreadDays ?? 1;
	if (
		!Number.isInteger(minSourceDiversity) ||
		minSourceDiversity < 1 ||
		!Number.isFinite(minSpreadDays) ||
		minSpreadDays < 0
	)
		throw new SoulsValidationError(
			'minSourceDiversity must be a positive integer and minSpreadDays must be non-negative and finite.',
		);
	const expiryMs = now - expiryDays * MS_PER_DAY;

	// Skip dormant souls
	const soul = db
		.prepare(`SELECT created_at, last_attuned_at, deleted_at FROM souls WHERE id = ?`)
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

	// Configurable source diversity.
	const sources = new Set(shards.map((s) => s.source));
	const sourceDiversity = sources.size;

	// Configurable occurrence-time spread.
	const timestamps = shards.map((s) => s.created_at);
	const oldest = Math.min(...timestamps);
	const newest = Math.max(...timestamps);
	const ageSpreadDays = (newest - oldest) / MS_PER_DAY;
	if (ageSpreadDays < minSpreadDays) return null;

	const native = shards.filter((s) => s.occurred_at >= s.inserted_at);
	const nativeTimes = native.map((s) => s.occurred_at);
	const nativeSpread = nativeTimes.length ? Math.max(...nativeTimes) - Math.min(...nativeTimes) : 0;
	const crossSourceSpread = shards.some((a) =>
		shards.some(
			(b) =>
				a.source !== b.source &&
				Math.abs(a.occurred_at - b.occurred_at) >= minSpreadDays * MS_PER_DAY,
		),
	);
	if (nativeSpread < minSpreadDays * MS_PER_DAY && !crossSourceSpread)
		return {
			ready: false,
			reason:
				minSpreadDays === 1
					? 'Age spread must span at least two sources by occurrence time.'
					: `Occurrence spread must span at least ${minSpreadDays} days in native observations or across sources.`,
			pendingCount,
			sourceDiversity,
			ageSpreadDays,
			clusterCount: 0,
			...(readiness === 'legacy'
				? {}
				: { convergedClusterCount: 0, largestClusterSize: 0, traceBackedCount: 0 }),
			priorityScore: 0,
		};
	if (sourceDiversity < minSourceDiversity) return null;
	// Condition: at least one shard after lastAttunedAt (recency gate)
	const lastAttuned = soul.last_attuned_at ?? 0;
	const priorityAnchor = soul.last_attuned_at ?? soul.created_at;
	const hasRecentShard = shards.some((s) => s.created_at > lastAttuned);
	if (!hasRecentShard) return null;

	// Phase 2: expensive in-memory cluster diversity check
	const live = traceTablesExist(db)
		? db
				.prepare(
					`SELECT st.shard_id,st.trace_id,COALESCE(t.weight,1) AS weight FROM shard_traces st JOIN soul_traces t ON t.id=st.trace_id WHERE t.state IN (0,1) AND NOT EXISTS (SELECT 1 FROM (${traceEdges(db)}) successor WHERE successor.parent=t.id)`,
				)
				.all<{ shard_id: number; trace_id: number; weight: number }>()
				.filter((r) => shards.some((s) => s.id === r.shard_id))
		: [];
	const backed = new Map<number, Set<number>>();
	for (const row of live) {
		const ids = backed.get(row.shard_id) ?? new Set<number>();
		ids.add(row.trace_id);
		backed.set(row.shard_id, ids);
	}
	const clusters = singleLinkageCluster(
		shards,
		(a, b) =>
			readiness !== 'legacy' &&
			[...(backed.get(a.id) ?? [])].some((id) => backed.get(b.id)?.has(id))
				? 1
				: trigramJaccard(a.content, b.content),
		clusterThreshold,
	);
	const clusterCount = clusters.length;
	const convergedClusterCount = clusters.filter(
		(c) => c.members.length >= minClusterSize && new Set(c.members.map((s) => s.source)).size >= 2,
	).length;
	const largestClusterSize = Math.max(0, ...clusters.map((c) => c.members.length));
	const traceBackedCount = backed.size;
	if (readiness === 'legacy' && clusterCount < MIN_CLUSTER_DIVERSITY) return null;
	const extra =
		readiness === 'legacy' ? {} : { convergedClusterCount, largestClusterSize, traceBackedCount };
	if (readiness !== 'legacy' && convergedClusterCount === 0)
		return {
			ready: false,
			reason: 'Requires a converged cluster spanning at least two sources.',
			pendingCount,
			sourceDiversity,
			ageSpreadDays,
			clusterCount,
			priorityScore: 0,
			...extra,
		};

	// Priority: pendingCount × sourceDiversity × ageSpreadDays × recencyFactor
	const daysSinceLastAttuned = (now - priorityAnchor) / MS_PER_DAY;
	const recencyFactor = 1 / Math.max(1, daysSinceLastAttuned);
	const priorityScore =
		pendingCount *
		sourceDiversity *
		ageSpreadDays *
		recencyFactor *
		(readiness !== 'legacy' && live.length
			? 1 + live.reduce((sum, r) => sum + r.weight, 0) / live.length
			: 1);

	return {
		ready: true,
		pendingCount,
		sourceDiversity,
		ageSpreadDays,
		clusterCount,
		priorityScore,
		...extra,
	};
}
