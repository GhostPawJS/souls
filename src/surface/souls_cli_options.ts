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
		if (toolName === 'trace_soul') {
			if (Array.isArray(input.soul))
				input.souls = input.soul.map((value) => {
					const text = String(value);
					const match = /^(.*):(owner|counterpart|subject|[012])$/.exec(text);
					return {
						soul: match?.[1] ?? text,
						role: match ? (/[012]/.test(match[2] ?? '') ? Number(match[2]) : match[2]) : 'owner',
					};
				});
			if (input.tag !== undefined) input.tags = input.tag;
			if (input.due !== undefined) input.dueAt = input.due === 'none' ? null : input.due;
			if (input.weight === 'none') input.weight = null;
			else if (typeof input.weight === 'string') input.weight = Number(input.weight);
			if (input.action === 'record' && input.at !== undefined) input.createdAt = input.at;
			if (input.settled !== undefined) {
				input.settle = {
					as: input.settled,
					reason: input.reason,
					...(input.at === undefined ? {} : { at: input.at }),
				};
				delete input.settled;
			}
			delete input.soul;
			delete input.tag;
			delete input.due;
		}
		if (toolName === 'review_traces') {
			if (typeof input.role === 'string' && /^[012]$/.test(input.role))
				input.role = Number(input.role);
			if (input.soul !== undefined) input.soulId = input.soul;
			if (input.with !== undefined) input.withSoulId = input.with;
			delete input.soul;
			delete input.with;
		}
		if (toolName === 'observe_soul' && Array.isArray(input.traceIds))
			input.traceIds = input.traceIds.flatMap((value) => String(value).split(',').map(Number));
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
