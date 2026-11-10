import type { SoulsDb } from '../database.ts';
import { normalizeTags } from '../shards/normalize_tag.ts';
import { changeTrace } from './change_trace.ts';
import type { Trace, TraceOptions } from './types.ts';
export function tagTrace(
	db: SoulsDb,
	id: number,
	tags: string[],
	options: TraceOptions & { reason?: string } = {},
): Trace {
	return changeTrace(db, id, 'tag', options, () => {
		for (const tag of normalizeTags(tags))
			db.prepare('INSERT OR IGNORE INTO soul_trace_tags VALUES (?,?)').run(id, tag);
	});
}
