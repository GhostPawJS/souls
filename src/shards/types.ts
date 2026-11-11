export const SHARD_STATUSES = ['pending', 'faded'] as const;
export type ShardStatus = (typeof SHARD_STATUSES)[number];

export interface ShardRow {
	withdrawn_at?: number | null;
	withdrawal_reason?: string | null;
	superseded_by?: number | null;
	inserted_at?: number | null;
	occurred_at?: number | null;
	idempotency_key?: string | null;
	ref?: string | null;
	id: number;
	content: string;
	source: string;
	status: ShardStatus;
	sealed: number; // 0 or 1
	created_at: number;
	updated_at: number;
}

export interface ShardRecord {
	withdrawnAt?: number;
	withdrawalReason?: string;
	supersededBy?: number;
	traces?: { id: number; state: import('../traces/types.ts').TraceState }[];
	insertedAt?: number | null;
	occurredAt?: number | null;
	idempotencyKey?: string | null;
	ref?: string | null;
	id: number;
	content: string;
	source: string;
	status: ShardStatus;
	sealed: boolean;
	soulIds: number[];
	traitIds: number[];
	tags: string[];
	createdAt: number;
	updatedAt: number;
}

export interface DropShardInput {
	tz?: string | undefined;
	traceIds?: number[] | undefined;
	occurredAt?: number | string | undefined;
	idempotencyKey?: string | undefined;
	ref?: string | undefined;
	content: string;
	source: string;
	soulIds: number[];
	tags?: string[] | undefined;
	sealed?: boolean | undefined;
	now?: number | undefined;
}

export interface DropShardResult {
	duplicate?: boolean;
	shard: ShardRecord;
	crystallizationTriggers: number[];
}

export interface DropShardsResult {
	results?: DropShardResult[];
	shards: ShardRecord[];
	crystallizationTriggers: number[];
}

export type ShardFilterStatus = 'pending' | 'sealed' | 'faded' | 'all';
export interface ShardPage {
	items: ShardRecord[];
	total: number;
	hasMore: boolean;
}

export interface ShardListOptions {
	status?: ShardFilterStatus | undefined;
	offset?: number | undefined;
	soulId?: number | undefined;
	source?: string | undefined;
	tags?: string[] | undefined;
	limit?: number | undefined;
	shardExpiryDays?: number | undefined;
	now?: number | undefined;
}

export interface SearchShardsOptions extends ShardListOptions {
	soulId?: number | undefined;
	limit?: number | undefined;
	shardExpiryDays?: number | undefined;
	now?: number | undefined;
}

export interface ShardCountRecord {
	soulId: number;
	pendingCount: number;
}

export interface TagCountRecord {
	tag: string;
	count: number;
}

export interface CrystallizationRecord {
	convergedClusterCount?: number;
	largestClusterSize?: number;
	traceBackedCount?: number;
	soulId: number;
	pendingCount: number;
	sourceDiversity: number;
	ageSpreadDays: number;
	clusterCount: number;
	priorityScore: number;
}

export type TraitAlignment =
	| { kind: 'reinforcing'; traitId: number; similarity: number }
	| { kind: 'novel' };

export interface CrossSoulOverlap {
	soulId: number;
	shardCount: number;
}

export interface EvidenceCluster {
	totalMembers?: number | undefined;
	members: ShardRecord[];
	weight: number;
	sourceDiversity: number;
	avgFreshness: number;
	alignment: TraitAlignment;
	sharedWith: CrossSoulOverlap[];
}

export interface PromotionCandidate {
	traitId: number;
	principle: string;
	score: number;
}

export interface TraitSignal {
	traitId: number;
	principle: string;
	tenure: number;
	citationCount: number;
	citationDensity: number;
	essenceRedundancy: number;
	stale: boolean;
	survivalCount: number;
}

export interface TraitTension {
	traitIdA: number;
	traitIdB: number;
	principleA: string;
	principleB: string;
	description: string;
}

export interface ConsolidationSuggestion {
	traitIds: number[];
	principles: string[];
	similarity: number;
}

export interface EvidenceReport {
	soulId: number;
	pendingCount: number;
	clusters: EvidenceCluster[];
	traitSignals: TraitSignal[];
	tensions: TraitTension[];
	consolidationSuggestions: ConsolidationSuggestion[];
	promotionCandidates: PromotionCandidate[];
	suggestedActions: string[];
	shardVelocity: number;
	renderedMarkdown: string;
}

export interface FormatEvidenceOptions {
	negationWords?: string[] | undefined;
	maxMembersPerCluster?: number | undefined;
	full?: boolean | undefined;
	clusterThreshold?: number | undefined;
	tags?: string[] | undefined;
	query?: string | undefined;
	shardExpiryDays?: number | undefined;
	staleDays?: number | undefined;
	now?: number | undefined;
}
