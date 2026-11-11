/** Project only the requested SQL columns, converting their names to record keys. */
export function projectRow<T>(row: object, columns: string[], omitNull = false): T {
	return Object.fromEntries(
		columns.flatMap((column) => {
			const value = (row as Record<string, unknown>)[column];
			return omitNull && value == null
				? []
				: [[column.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()), value]];
		}),
	) as T;
}
