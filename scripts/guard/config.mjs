import assert from 'node:assert/strict';
export const packageName = '@ghostpaw/souls';
export const publicEntries = ['.', './mcp'];
export const binName = 'ghostpaw-souls';
export const extraFiles = ['SKILL.md', 'skills/souls/SKILL.md'];
export const entries = {
	full: `export * from './dist/index.js';`,
	tools: `import {tools} from './dist/index.js'; export const registry = tools.soulsTools;`,
	'read-write': `export {read, write} from './dist/index.js';`,
	mcp: `export * from './dist/mcp.js';`,
	cli: { entryPoints: ['dist/cli.js'] },
	'mcp-server': { entryPoints: ['dist/mcp-server.js'] },
};
export const claim = {
	name: 'Reviewer',
	essence: 'Read intent before details.',
	description: 'Code review identity',
};
export const search = { query: 'jasmine' };
export const modernMeta = {
	'io.modelcontextprotocol/protocolVersion': '2026-07-28',
	'io.modelcontextprotocol/clientCapabilities': {},
};
export const discover = {
	jsonrpc: '2.0',
	id: 4,
	method: 'server/discover',
	params: { _meta: modernMeta },
};
export const searchRequest = {
	jsonrpc: '2.0',
	id: 5,
	method: 'tools/call',
	params: { name: 'search_souls', arguments: search, _meta: modernMeta },
};
export const legacyRequests = [
	{
		jsonrpc: '2.0',
		id: 1,
		method: 'initialize',
		params: {
			protocolVersion: '2025-11-25',
			capabilities: {},
			clientInfo: { name: 'guard', version: '1' },
		},
	},
	{ jsonrpc: '2.0', id: 2, method: 'tools/list' },
	{
		jsonrpc: '2.0',
		id: 3,
		method: 'tools/call',
		params: { name: 'search_souls', arguments: search },
	},
];
export const cliRemember = ['call', 'manage_soul', JSON.stringify({ action: 'create', ...claim })];
export const cliSearch = ['call', 'review_souls', JSON.stringify({ view: 'list' })];
export function assertApi(root, mcp) {
	for (const key of ['initSoulsTables', 'read', 'write', 'tools']) assert.ok(root[key], key);
	assert.equal(typeof mcp.createSoulsMcpServer, 'function');
}
export function smokeLibrary(api, db) {
	api.initSoulsTables(db);
	const soul = api.write.createSoul(db, claim);
	const observed = api.tools.getSoulsToolByName('observe_soul').handler(db, {
		action: 'drop',
		content: 'Careful jasmine review',
		source: 'manual_review',
		soulIds: [soul.id],
	});
	assert.equal(observed.outcome, 'success');
	const searched = api.tools.getSoulsToolByName('search_souls').handler(db, search);
	assert.ok(searched.data.shards.some((item) => item.id === observed.data.shardId));
}
export const typeConsumer = `import {DatabaseSync} from 'node:sqlite';
import {initSoulsTables, read, write} from '${packageName}';
import {createSoulsMcpServer} from '${packageName}/mcp';
const db = new DatabaseSync(':memory:'); initSoulsTables(db);
write.createSoul(db, {name: 'Reviewer', essence: 'Read intent', description: 'Review identity'});
read.searchShards(db, 'review'); createSoulsMcpServer({db});`;
export function createServer(mcp, db) {
	return mcp.createSoulsMcpServer({ db });
}
export function hotPaths(api, db, server) {
	return {
		'write.dropShard': (i) =>
			api.write.dropShard(
				db,
				seedClaim(i, () => 0.5),
			),
		'read.searchShards': () => api.read.searchShards(db, 'jasmine'),
		search_souls: () => api.tools.getSoulsToolByName('search_souls').handler(db, search),
		inspect_souls_item: () =>
			api.tools.getSoulsToolByName('inspect_souls_item').handler(db, { soulId: 1 }),
		review_souls: () => api.tools.getSoulsToolByName('review_souls').handler(db, { view: 'list' }),
		'MCP tools/call': () => server.handleLine(JSON.stringify(searchRequest)),
	};
}
export function seedClaim(i, random) {
	const topics = ['jasmine tea', 'database backups', 'release planning', 'code review'];
	return {
		content: `Reviewer documents ${topics[Math.floor(random() * topics.length)]} for project ${i}`,
		source: 'manual_review',
		soulIds: [1],
	};
}

export function consumerSmoke(configUrl) {
	return `import {createRequire} from 'node:module'; import {DatabaseSync} from 'node:sqlite';
 import {assertApi,smokeLibrary} from ${JSON.stringify(configUrl)};
 const require = createRequire(import.meta.url);
 const root = await import(${JSON.stringify(packageName)}); const mcp = await import(${JSON.stringify(`${packageName}/mcp`)});
 assertApi(root,mcp); assertApi(require(${JSON.stringify(packageName)}),require(${JSON.stringify(`${packageName}/mcp`)}));
 const db = new DatabaseSync(':memory:'); try {smokeLibrary(root,db);} finally {db.close();}`;
}
export function assertRoundTrip(remembered, searched) {
	assert.equal(remembered.outcome, 'success');
	assert.ok(searched.data.souls.some((item) => item.id === remembered.data.soul.id));
}
export function assertMcpReplies(replies) {
	assert.ok(replies[1].result.tools.some((tool) => tool.name === 'search_souls'));
	assert.equal(replies[2].result.structuredContent.outcome, 'success');
	assert.equal(replies[3].result.resultType, 'complete');
}
