export const SHARD_STATUSES = ['pending', 'faded'] as const;
export type ShardStatus = (typeof SHARD_STATUSES)[number];

export interface ShardRow {
	id: number;
	content: string;
	source: string;
	status: ShardStatus;
	sealed: number; // 0 or 1
	created_at: number;
	updated_at: number;
}

export interface ShardRecord {
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
	content: string;
	source: string;
	soulIds: number[];
	tags?: string[] | undefined;
	sealed?: boolean | undefined;
	now?: number | undefined;
}

export interface DropShardResult {
	shard: ShardRecord;
	crystallizationTriggers: number[];
}

export interface DropShardsResult {
	shards: ShardRecord[];
	crystallizationTriggers: number[];
}

export interface ShardListOptions {
	soulId?: number | undefined;
	source?: string | undefined;
	tags?: string[] | undefined;
	limit?: number | undefined;
	shardExpiryDays?: number | undefined;
	now?: number | undefined;
}

export interface SearchShardsOptions {
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
	clusterThreshold?: number | undefined;
	tags?: string[] | undefined;
	query?: string | undefined;
	shardExpiryDays?: number | undefined;
	staleDays?: number | undefined;
	now?: number | undefined;
}
