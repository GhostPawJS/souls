export interface SoulsRunResult {
	lastInsertRowid: number | bigint;
	changes?: number | bigint | undefined;
}

export interface SoulsStatement {
	run(...params: unknown[]): SoulsRunResult;
	get<TRecord = Record<string, unknown>>(...params: unknown[]): TRecord | undefined;
	all<TRecord = Record<string, unknown>>(...params: unknown[]): TRecord[];
}

export type SoulsDb = {
	exec(sql: string): void;
	prepare(sql: string): SoulsStatement;
	close(): void;
};
