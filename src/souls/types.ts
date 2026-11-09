import type { EvidenceGateOptions } from '../evidence_gate.ts';
export interface SoulRow {
	external_id?: string | null;
	id: number;
	name: string;
	slug: string | null;
	essence: string;
	description: string;
	level: number;
	created_at: number;
	updated_at: number;
	deleted_at: number | null;
	last_attuned_at: number | null;
}

export interface SoulRecord {
	externalId?: string | null;
	warnings?: string[] | undefined;
	id: number;
	name: string;
	slug: string | null;
	essence: string;
	description: string;
	level: number;
	createdAt: number;
	updatedAt: number;
	deletedAt: number | null;
	lastAttunedAt: number | null;
	isDormant: boolean;
}

export interface CreateSoulInput {
	externalId?: string | null | undefined;
	name: string;
	essence: string;
	description: string;
	slug?: string | null | undefined;
	now?: number | undefined;
}

export interface UpdateSoulInput extends EvidenceGateOptions {
	externalId?: string | null | undefined;
	name?: string | undefined;
	slug?: string | null | undefined;
	essence?: string | undefined;
	description?: string | undefined;
	now?: number | undefined;
}

export interface AwakenSoulOptions {
	name?: string | undefined;
	now?: number | undefined;
}

export interface RenderSoulOptions {
	order?: 'citations' | 'density' | undefined;
	now?: number | undefined;
	includeProvenance?: boolean | undefined;
}
