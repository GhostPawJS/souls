export { addTrait } from './add_trait.ts';
export { countActiveTraits } from './count_active_traits.ts';
export { getTrait } from './get_trait.ts';
export { DEFAULT_TRAIT_LIMIT, getTraitLimit } from './get_trait_limit.ts';
export { getTraitOrThrow } from './get_trait_or_throw.ts';
export { initTraitTables } from './init_trait_tables.ts';
export { listTraits } from './list_traits.ts';
export { mapTraitRow } from './map_trait_row.ts';
export { reactivateTrait } from './reactivate_trait.ts';
export { revertTrait } from './revert_trait.ts';
export { reviseTrait } from './revise_trait.ts';
export type {
	AddTraitInput,
	ListTraitsOptions,
	ReviseTraitInput,
	TRAIT_STATUSES,
	TraitRecord,
	TraitRow,
	TraitStatus,
} from './types.ts';
