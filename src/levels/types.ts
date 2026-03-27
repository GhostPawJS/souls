export interface LevelRow {
	id: number;
	soul_id: number;
	level: number;
	essence_before: string;
	essence_after: string;
	traits_consolidated: string; // JSON: number[]
	traits_promoted: string; // JSON: number[]
	traits_carried: string; // JSON: number[]
	traits_merged: string; // JSON: number[]
	created_at: number;
}

export interface LevelRecord {
	id: number;
	soulId: number;
	level: number;
	essenceBefore: string;
	essenceAfter: string;
	traitsConsolidated: number[];
	traitsPromoted: number[];
	traitsCarried: number[];
	traitsMerged: number[];
	createdAt: number;
}

export interface ConsolidationGroup {
	sourceTraitIds: number[];
	mergedPrinciple: string;
	mergedProvenance: string;
}

export interface LevelUpPlan {
	newEssence: string;
	consolidations: ConsolidationGroup[];
	promotedTraitIds: number[];
	carriedTraitIds: number[];
}

export interface LevelUpResult {
	level: number;
	snapshot: LevelRecord;
}

export interface LevelUpValidationError {
	missingTraitIds: number[];
	duplicateTraitIds: number[];
	invalidTraitIds: number[];
}

export interface LevelUpWarning {
	kind: 'weak_consolidation' | 'premature_promotion';
	traitIds: number[];
	message: string;
}
