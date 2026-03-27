import { strictEqual } from 'node:assert/strict';
import http from 'node:http';
import { after, describe, it } from 'node:test';
import { openEther } from './open_ether.ts';
import { refreshAll } from './refresh_all.ts';
import { registerSource } from './register_source.ts';

function createServer(
	handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
): Promise<{ url: string; server: http.Server }> {
	return new Promise((resolve) => {
		const server = http.createServer(handler);
		server.listen(0, '127.0.0.1', () => {
			const addr = server.address() as { port: number };
			resolve({ url: `http://127.0.0.1:${addr.port}`, server });
		});
	});
}

describe('refreshAll', () => {
	const servers: http.Server[] = [];
	after(() => {
		for (const s of servers) s.close();
	});

	it('refreshes all registered sources', async () => {
		const { url: csvUrl, server: s1 } = await createServer((_req, res) => {
			res.writeHead(200);
			res.end(`act,prompt\nA,"Content A"\n`);
		});
		servers.push(s1);

		const json = JSON.stringify({
			metadata: {},
			prompts: [{ agent_name: 'B', full_data: { 'System Prompt': 'Content B' } }],
		});
		const { url: jsonUrl, server: s2 } = await createServer((_req, res) => {
			res.writeHead(200);
			res.end(json);
		});
		servers.push(s2);

		const db = openEther(':memory:');
		registerSource(db, { id: 'csv', kind: 'github-csv', url: csvUrl, label: 'CSV' });
		registerSource(db, { id: 'json', kind: 'github-json', url: jsonUrl, label: 'JSON' });

		const result = await refreshAll(db);
		strictEqual(result.results.length, 2);
		strictEqual(result.totalEntries, 2);
		db.close();
	});

	it('returns empty results when no sources registered', async () => {
		const db = openEther(':memory:');
		const result = await refreshAll(db);
		strictEqual(result.results.length, 0);
		strictEqual(result.totalEntries, 0);
		db.close();
	});
});
