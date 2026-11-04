import type { SoulsDb } from '../database.ts';
import { soulsSkills } from '../skills/skill_registry.ts';
import type { ToolCliOptions } from '../surfaces/cli.ts';
import { soulsVersion } from '../version.ts';
import { resolveSoulReference, runHostCommand } from './host_commands.ts';
import { resolveSoulsDbPath } from './resolve_souls_db_path.ts';
import { soulsSurfaceTools } from './souls_surface_tools.ts';

export const soulsCliOptions: ToolCliOptions<SoulsDb> = {
	bin: 'ghostpaw-souls',
	defaultDbPath: () => (process.env.GHOSTPAW_SOULS_DB ? undefined : resolveSoulsDbPath()),
	customCommand: runHostCommand,
	resolveReference: resolveSoulReference,
	prepareInput: (input, toolName) => {
		if (
			toolName === 'observe_soul' &&
			typeof input.occurredAt === 'string' &&
			/^\d+$/.test(input.occurredAt)
		) {
			input.occurredAt = Number(input.occurredAt);
		}
	},
	version: soulsVersion,
	description: 'Local cognitive identity and behavioral evidence engine',
	tools: soulsSurfaceTools,
	openContext: async (options) => {
		const { openSoulsDb } = await import('./open_souls_db.ts');
		const { resolveSoulsDbPath } = await import('./resolve_souls_db_path.ts');
		return openSoulsDb(resolveSoulsDbPath(options.db === undefined ? {} : { flag: options.db }));
	},
	closeContext: (db) => db.close(),
	commands: {
		guides: soulsSkills,
		mcp: async (options) => {
			const { serveSoulsMcp } = await import('./serve_souls_mcp.ts');
			await serveSoulsMcp(options.db === undefined ? {} : { dbPath: options.db });
		},
		skill: async () => {
			const { renderSkillMarkdown } = await import('../surfaces/skill_markdown.ts');
			const { soulsSkillSpec } = await import('./souls_skill_spec.ts');
			return renderSkillMarkdown(soulsSkillSpec);
		},
	},
};
