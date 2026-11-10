import type { SoulsDb } from '../database.ts';

export function initTraceSearch(db: SoulsDb): void {
	const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE name='soul_traces_fts'").get();
	if (!exists) {
		try {
			db.exec(
				`CREATE VIRTUAL TABLE soul_traces_fts USING fts5(text, settle_reason, content='soul_traces', content_rowid='id')`,
			);
		} catch {
			return;
		}
	}
	db.exec(`
CREATE TRIGGER IF NOT EXISTS trace_fts_insert AFTER INSERT ON soul_traces BEGIN
INSERT INTO soul_traces_fts(rowid,text,settle_reason) VALUES(new.id,new.text,new.settle_reason);
END;
CREATE TRIGGER IF NOT EXISTS trace_fts_update AFTER UPDATE OF text,settle_reason ON soul_traces BEGIN
INSERT INTO soul_traces_fts(soul_traces_fts,rowid,text,settle_reason) VALUES('delete',old.id,old.text,old.settle_reason);
INSERT INTO soul_traces_fts(rowid,text,settle_reason) VALUES(new.id,new.text,new.settle_reason);
END;
`);
	if (!exists) db.exec("INSERT INTO soul_traces_fts(soul_traces_fts) VALUES('rebuild')");
}
