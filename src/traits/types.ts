export const TRAIT_STATUSES = ['active', 'consolidated', 'promoted', 'reverted'] as const;
export type TraitStatus = (typeof TRAIT_STATUSES)[number];

export interface TraitRow {
	id: number;
	soul_id: number;
	principle: string;
	provenance: string;
	generation: number;
	status: TraitStatus;
	merged_into: number | null;
	created_at: number;
	updated_at: number;
}

export interface TraitRecord {
	id: number;
	soulId: number;
	principle: string;
	provenance: string;
	generation: number;
	status: TraitStatus;
	mergedInto: number | null;
	createdAt: number;
	updatedAt: number;
}

export interface AddTraitInput {
	principle: string;
	provenance: string;
	now?: number | undefined;
}

export interface ReviseTraitInput {
	principle?: string | undefined;
	provenance?: string | undefined;
	now?: number | undefined;
}

export interface ListTraitsOptions {
	status?: TraitStatus | undefined;
	generation?: number | undefined;
}
