export type TraceState = 'open' | 'done' | 'dropped';
export type TraceRole = 'owner' | 'counterpart' | 'subject';
export type TraceTime = string | number;
export interface TraceLinkInput {
	soulId: number;
	role: TraceRole | 0 | 1 | 2;
}
export interface TraceLink {
	name?: string;
	slug?: string;
	soulId: number;
	role: TraceRole;
	createdAt: number;
}
export interface Trace {
	id: number;
	text: string;
	state: TraceState;
	weight: number | null;
	createdAt: number;
	updatedAt: number;
	dueAt: number | null;
	settledAt: number | null;
	settleReason: string | null;
	supersedes: number | null;
	mergedFrom?: number[];
	revision: number;
	souls: TraceLink[];
	tags: string[];
}
export interface TraceOptions {
	now?: TraceTime | undefined;
	tz?: string | undefined;
}
export interface RecordTraceInput extends TraceOptions {
	import?: boolean;
	updatedAt?: TraceTime;
	mergedFrom?: number[];
	settle?: { as: 'done' | 'dropped'; reason: string; at?: TraceTime };
	text: string;
	souls: TraceLinkInput[];
	tags?: string[];
	weight?: number | null;
	createdAt?: TraceTime;
	dueAt?: TraceTime | null;
	supersedes?: number | null | undefined;
	reason?: string;
}
export interface ReviseTraceInput extends TraceOptions {
	mergedFrom?: number[];
	text?: string;
	dueAt?: TraceTime | null;
	weight?: number | null;
	supersedes?: number | null | undefined;
	reason: string;
}
export interface ListTracesOptions extends TraceOptions {
	tags?: string[];
	all?: boolean;
	excludeTags?: string[];
	tagPrefix?: string;
	soulId?: number;
	role?: TraceRole | 0 | 1 | 2;
	state?: TraceState;
	tag?: string;
	dueBefore?: TraceTime;
	query?: string;
	includeSuperseded?: boolean;
	includeRetired?: boolean;
	limit?: number;
	offset?: number;
}
