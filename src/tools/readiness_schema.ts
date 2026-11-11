import { integerSchema, numberSchema } from './tool_metadata.ts';

/** Fresh fragments so a consumer mutating one tool cannot change another tool's schema. */
export function readinessSchema() {
	return {
		minSourceDiversity: integerSchema('Minimum source diversity (default 2).'),
		minSpreadDays: numberSchema('Minimum occurrence spread in days (default 1).'),
		readiness: { type: 'string' as const, enum: ['converged', 'legacy'] },
		minClusterSize: integerSchema('Minimum converged cluster size, default 3.'),
	};
}
