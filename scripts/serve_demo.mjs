import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

const PORT = Number(process.env.PORT) || 4173;
const ROOT = 'demo';

const MIME = {
	'.html': 'text/html',
	'.js': 'application/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.wasm': 'application/wasm',
};

const server = createServer((req, res) => {
	const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
	let filePath = join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname);

	if (!existsSync(filePath)) filePath = join(ROOT, 'index.html');

	try {
		const content = readFileSync(filePath);
		const ext = extname(filePath);
		res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
		res.end(content);
	} catch {
		res.writeHead(404);
		res.end('Not found');
	}
});

server.listen(PORT, () => {
	console.log(`Demo server running at http://localhost:${PORT}`);
});
