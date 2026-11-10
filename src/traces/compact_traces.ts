import type { SoulsDb } from '../database.ts';
import { withTransaction } from '../with_transaction.ts';
import { initTraceTables } from './init_trace_tables.ts';
import { traceTablesExist } from './trace_tables_exist.ts';
import { encodeSnapshot } from './trace_text_storage.ts';

export function compactTraces(db: SoulsDb, options: { dryRun?: boolean; vacuum?: boolean } = {}) {
	const rows = traceTablesExist(db)
		? db
				.prepare('SELECT id,snapshot FROM soul_trace_revisions ORDER BY id')
				.all<{ id: number; snapshot: string }>()
		: [];
	const before = rows.reduce((n, r) => n + Buffer.byteLength(r.snapshot), 0);
	// Dry runs do not initialize tables or alter the database.
	if (options.dryRun) {
		const after = rows.reduce((n, r) => {
			const value = JSON.parse(r.snapshot);
			if (typeof value.text === 'string' && value.text.length >= 256)
				value.text = { traceTextHash: '0'.repeat(64) };
			return n + Buffer.byteLength(JSON.stringify(value));
		}, 0);
		return { bytesBefore: before, bytesAfter: after, revisions: rows.length, dryRun: true };
	}
	const result = withTransaction(db, () => {
		initTraceTables(db);
		db.exec('DROP TRIGGER trace_revision_no_update');
		let after = 0;
		for (const row of rows) {
			const encoded = encodeSnapshot(db, row.snapshot);
			after += Buffer.byteLength(encoded);
			db.prepare('UPDATE soul_trace_revisions SET snapshot=? WHERE id=?').run(encoded, row.id);
		}
		initTraceTables(db);
		return { bytesBefore: before, bytesAfter: after, revisions: rows.length, dryRun: false };
	});
	if (options.vacuum) db.exec('VACUUM');
	return result;
}
