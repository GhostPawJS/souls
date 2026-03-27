import { ok, rejects, strictEqual } from 'node:assert/strict';
import http from 'node:http';
import { after, describe, it } from 'node:test';
import { EtherFetchError } from './errors.ts';
import { fetchText } from './fetch_text.ts';

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

describe('fetchText', () => {
	const servers: http.Server[] = [];
	after(() => {
		for (const s of servers) s.close();
	});

	it('fetches plain text from a URL', async () => {
		const { url, server } = await createServer((_req, res) => {
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			res.end('hello ether');
		});
		servers.push(server);

		const result = await fetchText(url);
		strictEqual(result.status, 200);
		strictEqual(result.body, 'hello ether');
	});

	it('returns etag from response', async () => {
		const { url, server } = await createServer((_req, res) => {
			res.writeHead(200, { ETag: '"abc123"' });
			res.end('data');
		});
		servers.push(server);

		const result = await fetchText(url);
		strictEqual(result.etag, '"abc123"');
	});

	it('sends If-None-Match and handles 304', async () => {
		const { url, server } = await createServer((req, res) => {
			if (req.headers['if-none-match'] === '"abc"') {
				res.writeHead(304);
				res.end();
			} else {
				res.writeHead(200);
				res.end('data');
			}
		});
		servers.push(server);

		const result = await fetchText(url, { etag: '"abc"' });
		strictEqual(result.status, 304);
		strictEqual(result.body, '');
	});

	it('follows redirects', async () => {
		const { url: targetUrl, server: targetServer } = await createServer((_req, res) => {
			res.writeHead(200);
			res.end('redirected');
		});
		servers.push(targetServer);

		const { url, server } = await createServer((_req, res) => {
			res.writeHead(302, { Location: targetUrl });
			res.end();
		});
		servers.push(server);

		const result = await fetchText(url);
		strictEqual(result.body, 'redirected');
	});

	it('rejects on HTTP 404', async () => {
		const { url, server } = await createServer((_req, res) => {
			res.writeHead(404);
			res.end();
		});
		servers.push(server);

		await rejects(() => fetchText(url), EtherFetchError);
	});

	it('rejects on timeout', async () => {
		const { url, server } = await createServer((_req, _res) => {
			// intentionally never respond
		});
		servers.push(server);

		await rejects(() => fetchText(url, { timeoutMs: 100 }), EtherFetchError);
	});

	it('rejects on connection refused', async () => {
		await rejects(() => fetchText('http://127.0.0.1:1'), EtherFetchError);
	});

	it('sends User-Agent header', async () => {
		let receivedUA = '';
		const { url, server } = await createServer((req, res) => {
			receivedUA = req.headers['user-agent'] ?? '';
			res.writeHead(200);
			res.end('ok');
		});
		servers.push(server);

		await fetchText(url);
		ok(receivedUA.includes('ghostpaw'));
	});
});
