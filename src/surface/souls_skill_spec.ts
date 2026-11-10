import { soulsSkills } from '../skills/skill_registry.ts';
import { soulsSoulTraits } from '../soul.ts';
import { soulsMcpInstructions } from './souls_mcp_instructions.ts';
import { soulsSurfaceTools } from './souls_surface_tools.ts';

export const soulsSkillSpec = {
	name: 'souls',
	description:
		'Store and refine cognitive identities, traits, behavioral evidence, and persistent traces. Use when recording observations, reviewing soul health, or consolidating traits.',
	license: 'MIT',
	compatibility:
		'Release binary ghostpaw-souls (no runtime needed); MCP stdio via ghostpaw-souls mcp.',
	bin: 'ghostpaw-souls',
	packageName: '@ghostpaw/souls',
	server: 'ghostpaw-souls',
	about: `${soulsMcpInstructions}

## Running inside sandboxed agent harnesses

Inside a Codex CLI \`--sandbox workspace-write\` session, the database and its
parent directory must be inside a writable root, including SQLite's \`-wal\` and
\`-shm\` side files. A default DB under \`~/.ghostpaw\` outside those roots can fail
with \`SQLITE_CANTOPEN\` or \`EPERM\` (often exit 70; directory creation failures
may exit 2), even when normal shell permissions allow access. Put the DB inside the workspace with \`--db ./state/souls.db\`,
or set \`GHOSTPAW_SOULS_DB="$PWD/state/souls.db"\` for CLI/MCP use.

To use an external DB directory, add it when starting the OpenAI Codex CLI
(replace \`<dir-with-db>\` with its absolute path):

\`\`\`sh
codex exec --sandbox workspace-write --add-dir <dir-with-db> "Run the GhostPaw CLI"
\`\`\`

Alternatively, set \`sandbox_workspace_write.writable_roots\` in
\`~/.codex/config.toml\` before starting the session:

\`\`\`toml
[sandbox_workspace_write]
writable_roots = ["/absolute/dir-with-db"]
\`\`\`

## What goes where

| Store | Use for |
| --- | --- |
| souls | Agent identity and voice. |
| codex | Beliefs with uncertainty and provenance: things that might be wrong or change. |
| affinity | People, organizations, agents, and their relationships. |
| questlog | Tasks and deadlines. |
| grimoire | Procedures and how-tos. |
| Plain memory/files | Stable operational facts. |

For boundary cases, keep identity in souls, a revisable claim about someone in codex linked to their affinity record, actionable work in questlog, and reusable steps in grimoire; leave stable setup details in plain memory/files.
`,
	tools: soulsSurfaceTools,
	workflows: soulsSkills,
	principles: soulsSoulTraits.map((trait) => trait.principle),
};
