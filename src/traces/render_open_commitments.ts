import type { SoulsDb } from '../database.ts';
import { dueTraces } from './due_traces.ts';
import { listTraces } from './list_traces.ts';
export function renderOpenCommitments(
	db: SoulsDb,
	soulId: number,
	mode: 'open' | 'due',
	now?: number,
): string {
	const traces =
		mode === 'due'
			? dueTraces(db, { soulId, now })
			: listTraces(db, { soulId, state: 'open', limit: 2147483647 }).traces;
	return traces.length
		? '\n\n## Open commitments\n' +
				traces
					.map(
						(t) =>
							`- trace #${t.id}: ${t.text}${t.dueAt === null ? '' : ` (due ${new Date(t.dueAt).toISOString()})`}`,
					)
					.join('\n')
		: '';
}
