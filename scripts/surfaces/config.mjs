import { readFileSync } from 'node:fs';
import { soulsSkills } from '../../src/skills/skill_registry.ts';
import { soulsSkillSpec } from '../../src/surface/souls_skill_spec.ts';
import { soulsSurfaceTools } from '../../src/surface/souls_surface_tools.ts';

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
export const config = {
	slug: 'souls',
	skill: soulsSkillSpec,
	workflows: soulsSkills,
	manifest: {
		name: 'ghostpaw-souls',
		version: pkg.version,
		description:
			'Local cognitive identity engine with traits, behavioral evidence, and revision history.',
		author: pkg.author,
		homepage: pkg.homepage,
		repository: pkg.repository.url,
		license: pkg.license,
		keywords: pkg.keywords,
		server: 'ghostpaw-souls',
		packageName: pkg.name,
		mcpName: 'io.github.GhostPawJS/souls',
		title: 'GhostPaw Souls',
		websiteUrl: pkg.homepage,
		environment: [
			{
				name: 'GHOSTPAW_SOULS_DB',
				description: 'SQLite database path (default: ~/.ghostpaw/souls.db)',
			},
		],
	},
};

export const mcpbSpec = {
	...config.manifest,
	longDescription:
		'Local cognitive identity engine with traits and behavioral evidence. Stores data in a local SQLite database.',
	documentation: 'https://github.com/GhostPawJS/souls/blob/main/README.md',
	support: pkg.bugs.url,
	entryPoint: 'server/mcp-server.js',
	env: { GHOSTPAW_SOULS_DB: `\${user_config.db_path}` },
	userConfig: {
		db_path: {
			type: 'string',
			title: 'Database path',
			description: 'Path to the local SQLite database.',
			required: false,
			default: `\${HOME}/.ghostpaw/souls.db`,
		},
	},
	tools: soulsSurfaceTools.map(({ name, description }) => ({ name, description })),
};
