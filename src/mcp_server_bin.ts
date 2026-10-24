const args = process.argv.slice(2);
let dbPath: string | undefined;
for (let i = 0; i < args.length; i++) {
	if (args[i] !== '--db' || !args[i + 1])
		throw new Error('Usage: node dist/mcp-server.js [--db <path>]');
	dbPath = args[++i];
}
const { serveSoulsMcp } = await import('./surface/serve_souls_mcp.ts');
await serveSoulsMcp(dbPath === undefined ? {} : { dbPath });
export {};
