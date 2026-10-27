// Smoke test for a built SEA binary: version, a SQLite write and read, and an
// MCP initialize + tools/list round trip over stdio.
//   node scripts/sea/smoke.mjs [path-to-binary]   (default: this host's build in dist-sea/)
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const host = `${process.platform === 'win32' ? 'windows' : process.platform}-${process.arch}`;
const binary = resolve(
	process.argv[2] ?? `dist-sea/${host}/ghostpaw-souls${process.platform === 'win32' ? '.exe' : ''}`,
);
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const dir = mkdtempSync(join(tmpdir(), 'sea-smoke-'));
const db = join(dir, 'souls.db');
const fail = (message) => {
	console.error(`smoke: ${message}`);
	process.exit(1);
};
const run = (args) => {
	const r = spawnSync(binary, args, { encoding: 'utf8' });
	if (r.status !== 0) fail(`${args.join(' ')} exited ${r.status}\n${r.stderr}`);
	if (r.stderr) fail(`${args.join(' ')} wrote to stderr:\n${r.stderr}`);
	return r.stdout;
};

const version = run(['--version']).trim();
if (run(['--version', '--short']) !== `${pkg.version}\n`)
	fail('--version --short did not print the package version');
const versionJson = JSON.parse(run(['--version', '--json']));
if (versionJson.version !== pkg.version || versionJson.variant !== 'binary')
	fail('--version --json did not identify the binary and package version');
const expectedVersion = `souls ${pkg.version} (binary, ${process.platform === 'win32' ? 'windows' : process.platform}-${process.arch})`;
if (version !== expectedVersion) fail(`--version printed ${version}, expected ${expectedVersion}`);
run(['--help']);
const added = JSON.parse(
	run([
		'soul',
		'create',
		'Binary smoke marker',
		'--essence',
		'Read carefully.',
		'--description',
		'Smoke identity',
		'--db',
		db,
		'--json',
	]),
);
if (!added.ok) fail(`write failed: ${JSON.stringify(added)}`);
const found = JSON.parse(run(['soul', 'show', String(added.data.soul.id), '--db', db, '--json']));
if (found.data?.profile?.soul?.id !== added.data.soul.id)
	fail(`read failed: ${JSON.stringify(found)}`);

const tools = await new Promise((done) => {
	const child = spawn(binary, ['mcp', '--db', db], {
		stdio: ['pipe', 'pipe', 'pipe'],
	});
	let out = '';
	let err = '';
	child.stderr.on('data', (chunk) => {
		err += String(chunk);
	});
	const timer = setTimeout(() => fail('mcp did not answer within 10 s'), 10_000);
	child.stdout.setEncoding('utf8');
	child.stdout.on('data', (chunk) => {
		out += chunk;
		const line = out.split('\n').find((l) => l.includes('"id":2'));
		if (!line) return;
		const initialized = out.split('\n').some((line) => {
			if (!line.trim()) return false;
			const message = JSON.parse(line);
			return message.id === 1 && message.result?.serverInfo;
		});
		if (!initialized) fail('mcp initialize returned no serverInfo');
		const listed = JSON.parse(line).result?.tools ?? [];
		child.once('exit', (code) => {
			clearTimeout(timer);
			if (code !== 0 || err) fail(`mcp exited ${code}: ${err}`);
			done(listed);
		});
		child.stdin.end();
	});
	const send = (msg) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...msg })}\n`);
	send({
		id: 1,
		method: 'initialize',
		params: {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'smoke', version: '0' },
		},
	});
	send({ method: 'notifications/initialized' });
	send({ id: 2, method: 'tools/list' });
});
if (tools.length === 0) fail('mcp tools/list returned no tools');
rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
console.log(`smoke ok: ${binary} ${version}, sqlite write+read, mcp ${tools.length} tools`);
