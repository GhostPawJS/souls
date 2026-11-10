import type { SoulsDb } from '../database.ts';
import { normalizeTags } from '../shards/normalize_tag.ts';
import { safeText } from './assert_trace_text.ts';
import { changeTrace } from './change_trace.ts';
import type { Trace, TraceOptions } from './types.ts';
export function untagTrace(
	db: SoulsDb,
	id: number,
	tags: string[],
	options: TraceOptions & { reason: string },
): Trace {
	return changeTrace(db, id, 'untag', options, () => {
		safeText(options.reason, 'reason');
		for (const tag of normalizeTags(tags))
			db.prepare('DELETE FROM soul_trace_tags WHERE trace_id=? AND tag=?').run(id, tag);
	});
}
