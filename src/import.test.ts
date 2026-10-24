import { strictEqual } from 'node:assert/strict';
import { it } from 'node:test';
import { Worker } from 'node:worker_threads';

it('imports the public API without loading HTTP transports or SQLite', async () => {
	const worker = new Worker(
		`
const { parentPort } = require('node:worker_threads');
import('./src/index.ts').then(() => parentPort.postMessage(
  process.moduleLoadList.filter(name => /^NativeModule (?:https?|sqlite)$/.test(name))
));
`,
		{ eval: true },
	);
	const loaded = await new Promise<string[]>((resolve, reject) => {
		worker.once('message', resolve);
		worker.once('error', reject);
	});
	strictEqual(loaded.length, 0);
});
