export type EtherSourceKind = 'github-csv' | 'github-json';

export interface EtherSourceInput {
	id: string;
	kind: EtherSourceKind;
	url: string;
	label: string;
}

export interface EtherSourceRow {
	id: string;
	kind: string;
	url: string;
	label: string;
	etag: string | null;
	last_fetched_at: number | null;
	entry_count: number;
}

export interface EtherSource {
	id: string;
	kind: EtherSourceKind;
	url: string;
	label: string;
	etag: string | null;
	lastFetchedAt: number | null;
	entryCount: number;
}

export interface RawEtherEntry {
	externalId: string;
	name: string;
	description: string;
	content: string;
	category?: string | undefined;
	tags?: string | undefined;
	metadata?: string | undefined;
}

export interface EtherEntryRow {
	id: number;
	source_id: string;
	external_id: string;
	name: string;
	description: string;
	content: string;
	category: string | null;
	tags: string | null;
	metadata: string | null;
	fetched_at: number;
}

export interface EtherEntry {
	id: number;
	sourceId: string;
	externalId: string;
	name: string;
	description: string;
	content: string;
	category: string | null;
	tags: string[];
	metadata: Record<string, unknown> | null;
	fetchedAt: number;
}

export interface EtherSearchResult {
	id: number;
	sourceId: string;
	name: string;
	description: string;
	content: string;
	category: string | null;
	tags: string[];
	rank: number;
}

export interface EtherRefreshResult {
	sourceId: string;
	entriesWritten: number;
	skipped: boolean;
	durationMs: number;
}

export interface EtherRefreshAllResult {
	results: EtherRefreshResult[];
	totalEntries: number;
}

export interface FetchTextResult {
	body: string;
	etag: string | null;
	status: number;
}

export interface SearchOptions {
	sourceId?: string | undefined;
	category?: string | undefined;
	limit?: number | undefined;
}

export interface ManifestOptions {
	name?: string | undefined;
	description?: string | undefined;
	slug?: string | undefined;
	now?: number | undefined;
}

export interface RefreshOptions {
	timeoutMs?: number | undefined;
}
