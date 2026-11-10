import type { SoulsDb } from '../database.ts';
import { SoulsValidationError } from '../errors.ts';
import { withTransaction } from '../with_transaction.ts';
import { recordTrace } from './record_trace.ts';
import type { RecordTraceInput } from './types.ts';
export function recordTraceBatch(db: SoulsDb, items: RecordTraceInput[]) {
	return withTransaction(db, () =>
		items.map((item, index) => {
			try {
				return recordTrace(db, item);
			} catch (error) {
				throw new SoulsValidationError(
					`Line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}),
	);
}
