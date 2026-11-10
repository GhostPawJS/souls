import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { read, write } from '../dist/index.js';

// Only operate on the explicit operator-provided copy. Never infer a database path.
const path = process.argv[2];
if (!path || process.argv.length !== 3 || !existsSync(path))
	throw new Error('Usage: node scripts/trace-migration-smoke.mjs <path-to-db-copy>');
const hash = () => createHash('sha256').update(readFileSync(path)).digest('hex');
const beforeHash = hash();
const { openSoulsDb } = await import('../src/surface/open_souls_db.ts');
const raw = new DatabaseSync(path, { readOnly: true });
const version = raw.prepare('PRAGMA schema_version').get().schema_version;
const tables = raw
	.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
	.all()
	.map((r) => r.name)
	.filter((n) => !n.startsWith('soul_trace') && n !== 'shard_traces' && n !== 'sqlite_sequence');
const dump = (db) =>
	Object.fromEntries(
		tables.map((n) => [n, db.prepare(`SELECT * FROM "${n.replaceAll('"', '""')}"`).all()]),
	);
const before = dump(raw);
raw.close();
let db = await openSoulsDb(path);
const now = Date.now();
const souls = read.listSouls(db);
for (const soul of souls) {
	read.renderSoul(db, soul.id);
	read.renderPublication(db, soul.id);
	read.getSoulProfile(db, soul.id);
	read.formatEvidence(db, soul.id);
}
read.crystallizationReadiness(db);
read.listShards(db);
read.getRevisionHistory(db);
read.listTraces(db);
read.dueTraces(db);
read.changedSince(db, now - 86400000, { now });
read.traceStats(db, { now });
assert.equal(db.prepare('PRAGMA schema_version').get().schema_version, version);
assert.equal(hash(), beforeHash);
db.close();
assert.equal(hash(), beforeHash);
db = await openSoulsDb(path);
assert.ok(souls.length, 'A synthetic trace needs at least one active soul in this DB copy');
const trace = write.recordTrace(db, {
	text: 'Migration smoke verification',
	souls: [{ soulId: souls[0].id, role: 'owner' }],
	now,
});
assert.deepEqual(dump(db), before);
const migratedVersion = db.prepare('PRAGMA schema_version').get().schema_version;
db.close();
const migratedHash = hash();
db = await openSoulsDb(path);
assert.equal(db.prepare('PRAGMA schema_version').get().schema_version, migratedVersion);
assert.deepEqual(dump(db), before);
db.close();
assert.equal(hash(), migratedHash);
console.log(
	JSON.stringify(
		{
			path: resolve(path),
			readOnlyChecks: true,
			oldRowsPreserved: true,
			reopenIdempotent: true,
			beforeHash,
			afterHash: migratedHash,
			schemaVersionBefore: version,
			schemaVersionAfter: migratedVersion,
			traceId: trace.id,
		},
		null,
		2,
	),
);
