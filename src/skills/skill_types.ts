export interface SoulsSkill {
	name: string;
	description: string;
	content: string;
}

export type SoulsSkillRegistry = readonly SoulsSkill[];

export function defineSoulsSkill<TSkill extends SoulsSkill>(skill: TSkill): TSkill {
	return skill;
}
