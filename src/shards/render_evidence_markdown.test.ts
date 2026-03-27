import { ok } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderEvidenceMarkdown } from './render_evidence_markdown.ts';
import type { EvidenceReport } from './types.ts';

const baseReport: EvidenceReport = {
	soulId: 1,
	pendingCount: 3,
	clusters: [],
	traitSignals: [],
	tensions: [],
	consolidationSuggestions: [],
	promotionCandidates: [],
	suggestedActions: [],
	shardVelocity: 0.1,
	renderedMarkdown: '',
};

describe('renderEvidenceMarkdown', () => {
	it('renders the report header', () => {
		const md = renderEvidenceMarkdown(baseReport);
		ok(md.includes('# Evidence Report'));
		ok(md.includes('Soul ID'));
		ok(md.includes('Pending shards'));
	});

	it('includes suggested actions section when present', () => {
		const report: EvidenceReport = {
			...baseReport,
			suggestedActions: ['2 traits flagged stale', '1 level-up recommended'],
		};
		const md = renderEvidenceMarkdown(report);
		ok(md.includes('## Suggested Actions'));
		ok(md.includes('stale'));
	});

	it('includes cluster alignment labels', () => {
		const report: EvidenceReport = {
			...baseReport,
			clusters: [
				{
					members: [
						{
							id: 1,
							content: 'c',
							source: 's',
							status: 'pending',
							sealed: false,
							soulIds: [],
							traitIds: [],
							tags: [],
							createdAt: 1,
							updatedAt: 1,
						},
					],
					weight: 1.5,
					sourceDiversity: 1,
					avgFreshness: 0.8,
					alignment: { kind: 'reinforcing', traitId: 3, similarity: 0.4 },
					sharedWith: [],
				},
			],
		};
		const md = renderEvidenceMarkdown(report);
		ok(md.includes('reinforcing trait #3'));
	});

	it('shows novel label for unaligned clusters', () => {
		const report: EvidenceReport = {
			...baseReport,
			clusters: [
				{
					members: [
						{
							id: 2,
							content: 'c',
							source: 's',
							status: 'pending',
							sealed: false,
							soulIds: [],
							traitIds: [],
							tags: [],
							createdAt: 1,
							updatedAt: 1,
						},
					],
					weight: 0.5,
					sourceDiversity: 1,
					avgFreshness: 0.5,
					alignment: { kind: 'novel' },
					sharedWith: [],
				},
			],
		};
		const md = renderEvidenceMarkdown(report);
		ok(md.includes('novel'));
	});

	it('includes promotion candidates section when present', () => {
		const report: EvidenceReport = {
			...baseReport,
			promotionCandidates: [{ traitId: 1, principle: 'Think carefully', score: 0.042 }],
		};
		const md = renderEvidenceMarkdown(report);
		ok(md.includes('## Promotion Candidates'));
		ok(md.includes('Think carefully'));
	});
});
