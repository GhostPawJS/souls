export interface SoulRow {
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
	name: string;
	essence: string;
	description: string;
	slug?: string | null | undefined;
	now?: number | undefined;
}

export interface UpdateSoulInput {
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
	includeProvenance?: boolean | undefined;
}
