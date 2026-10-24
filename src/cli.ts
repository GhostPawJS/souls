import { soulsSurfaceTools } from './surface/souls_surface_tools.ts';
import { runToolCli } from './surfaces/cli.ts';
import { soulsVersion } from './version.ts';

process.exitCode = await runToolCli(process.argv.slice(2), {
	bin: 'ghostpaw-souls',
	version: soulsVersion,
	description: 'Local cognitive identity and behavioral evidence engine',
	tools: soulsSurfaceTools,
	openContext: async (options) => {
		const { openSoulsDb } = await import('./surface/open_souls_db.ts');
		const { resolveSoulsDbPath } = await import('./surface/resolve_souls_db_path.ts');
		return openSoulsDb(resolveSoulsDbPath(options.db === undefined ? {} : { flag: options.db }));
	},
	closeContext: (db) => db.close(),
	commands: {
		mcp: async (options) => {
			const { serveSoulsMcp } = await import('./surface/serve_souls_mcp.ts');
			await serveSoulsMcp(options.db === undefined ? {} : { dbPath: options.db });
		},
		skill: async () => {
			const { renderSkillMarkdown } = await import('./surfaces/skill_markdown.ts');
			const { soulsSkillSpec } = await import('./surface/souls_skill_spec.ts');
			return renderSkillMarkdown(soulsSkillSpec);
		},
	},
});
