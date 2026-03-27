import { ok, rejects, strictEqual } from 'node:assert/strict';
import http from 'node:http';
import { after, describe, it } from 'node:test';
import { EtherNotFoundError } from './errors.ts';
import { openEther } from './open_ether.ts';
import { refreshSource } from './refresh_source.ts';
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

describe('refreshSource', () => {
	const servers: http.Server[] = [];
	after(() => {
		for (const s of servers) s.close();
	});

	it('fetches CSV source and populates entries', async () => {
		const csv = `act,prompt\nBot,"Hello world."\nHelper,"I help you."\n`;
		const { url, server } = await createServer((_req, res) => {
			res.writeHead(200, { ETag: '"v1"' });
			res.end(csv);
		});
		servers.push(server);

		const db = openEther(':memory:');
		registerSource(db, { id: 'test-csv', kind: 'github-csv', url, label: 'Test CSV' });
		const result = await refreshSource(db, 'test-csv');

		strictEqual(result.entriesWritten, 2);
		strictEqual(result.skipped, false);
		ok(result.durationMs >= 0);

		const count = db.prepare(`SELECT COUNT(*) AS cnt FROM ether_entries`).get<{ cnt: number }>();
		strictEqual(count?.cnt, 2);

		const src = db
			.prepare(`SELECT etag, entry_count FROM ether_sources WHERE id = ?`)
			.get<{ etag: string; entry_count: number }>('test-csv');
		strictEqual(src?.etag, '"v1"');
		strictEqual(src?.entry_count, 2);
		db.close();
	});

	it('fetches JSON source and populates entries', async () => {
		const json = JSON.stringify({
			metadata: { total_prompts: 1 },
			prompts: [{ agent_name: 'Agent', full_data: { 'System Prompt': 'You are an agent.' } }],
		});
		const { url, server } = await createServer((_req, res) => {
			res.writeHead(200);
			res.end(json);
		});
		servers.push(server);

		const db = openEther(':memory:');
		registerSource(db, { id: 'test-json', kind: 'github-json', url, label: 'Test JSON' });
		const result = await refreshSource(db, 'test-json');

		strictEqual(result.entriesWritten, 1);
		const row = db
			.prepare(`SELECT name FROM ether_entries WHERE source_id = ?`)
			.get<{ name: string }>('test-json');
		strictEqual(row?.name, 'Agent');
		db.close();
	});

	it('skips on 304 Not Modified', async () => {
		const { url, server } = await createServer((req, res) => {
			if (req.headers['if-none-match'] === '"v1"') {
				res.writeHead(304);
				res.end();
			} else {
				res.writeHead(200, { ETag: '"v1"' });
				res.end(`act,prompt\nA,"B"\n`);
			}
		});
		servers.push(server);

		const db = openEther(':memory:');
		registerSource(db, { id: 's', kind: 'github-csv', url, label: 'S' });
		await refreshSource(db, 's');

		const result2 = await refreshSource(db, 's');
		strictEqual(result2.skipped, true);
		db.close();
	});

	it('preserves old data on fetch failure', async () => {
		let callCount = 0;
		const { url, server } = await createServer((_req, res) => {
			callCount++;
			if (callCount === 1) {
				res.writeHead(200);
				res.end(`act,prompt\nOld,"Old content."\n`);
			} else {
				res.writeHead(500);
				res.end('error');
			}
		});
		servers.push(server);

		const db = openEther(':memory:');
		registerSource(db, { id: 's', kind: 'github-csv', url, label: 'S' });
		await refreshSource(db, 's');

		const before = db.prepare(`SELECT COUNT(*) AS cnt FROM ether_entries`).get<{ cnt: number }>();
		strictEqual(before?.cnt, 1);

		await rejects(() => refreshSource(db, 's'));

		const after_ = db.prepare(`SELECT COUNT(*) AS cnt FROM ether_entries`).get<{ cnt: number }>();
		strictEqual(after_?.cnt, 1);
		db.close();
	});

	it('throws EtherNotFoundError for unknown source', async () => {
		const db = openEther(':memory:');
		await rejects(() => refreshSource(db, 'nope'), EtherNotFoundError);
		db.close();
	});
});
