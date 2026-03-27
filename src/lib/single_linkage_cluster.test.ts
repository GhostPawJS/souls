import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { singleLinkageCluster } from './single_linkage_cluster.ts';

const similarity = (a: string, b: string): number => (a[0] === b[0] ? 1 : 0);

describe('singleLinkageCluster', () => {
	it('returns empty array for empty input', () => {
		strictEqual(singleLinkageCluster([], similarity, 0.5).length, 0);
	});

	it('puts each item in its own cluster when nothing is similar', () => {
		const clusters = singleLinkageCluster(['apple', 'banana', 'cherry'], similarity, 1);
		strictEqual(clusters.length, 3);
	});

	it('merges items that share similarity above threshold', () => {
		const clusters = singleLinkageCluster(['apple', 'ant', 'banana'], similarity, 1);
		strictEqual(clusters.length, 2);
		const bigCluster = clusters.find((c) => c.members.length === 2);
		ok(bigCluster);
		ok(bigCluster.members.includes('apple'));
		ok(bigCluster.members.includes('ant'));
	});
});
