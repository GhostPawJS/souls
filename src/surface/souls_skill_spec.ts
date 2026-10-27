import { soulsSkills } from '../skills/skill_registry.ts';
import { soulsSoulTraits } from '../soul.ts';
import { soulsMcpInstructions } from './souls_mcp_instructions.ts';
import { soulsSurfaceTools } from './souls_surface_tools.ts';

export const soulsSkillSpec = {
	name: 'souls',
	description:
		'Store and refine cognitive identities, traits, and behavioral evidence. Use when recording observations, reviewing soul health, or consolidating traits.',
	license: 'MIT',
	compatibility:
		'Release binary ghostpaw-souls (no runtime needed); MCP stdio via ghostpaw-souls mcp.',
	bin: 'ghostpaw-souls',
	packageName: '@ghostpaw/souls',
	server: 'ghostpaw-souls',
	about: soulsMcpInstructions,
	tools: soulsSurfaceTools,
	workflows: soulsSkills,
	principles: soulsSoulTraits.map((trait) => trait.principle),
};
