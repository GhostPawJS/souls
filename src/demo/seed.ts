import type { SoulsDb } from '../database.ts';
import * as write from '../write.ts';

const MS_PER_DAY = 86_400_000;
const _MS_PER_HOUR = 3_600_000;

export function loadSeeds(db: SoulsDb): void {
	const now = Date.now();

	// ── Soul 1: Architect (Level 3, crystallization-ready) ──────

	const architect = write.createSoul(db, {
		name: 'Architect',
		essence:
			'I design systems by identifying the actual forces at play before choosing a structure. ' +
			'Elegance is a side effect of understanding the problem deeply, not a goal in itself. ' +
			'When a design decision is ambiguous, I make the constraints explicit and let them resolve the choice.',
		description: 'System design and technical decision-making agent',
		now: now - 42 * MS_PER_DAY,
	});

	// Gen-1 traits (will be consolidated in first level-up)
	const archTrait1 = write.addTrait(db, architect.id, {
		principle: 'Always prefer simplicity over cleverness',
		provenance: 'Observed consistent failure of "clever" solutions under maintenance pressure',
		now: now - 40 * MS_PER_DAY,
	});
	const archTrait2 = write.addTrait(db, architect.id, {
		principle: 'Avoid premature abstraction until at least three concrete instances exist',
		provenance: 'Three consecutive over-engineered modules had to be rewritten',
		now: now - 38 * MS_PER_DAY,
	});
	const archTrait3 = write.addTrait(db, architect.id, {
		principle: 'Name things for what they do, not what they are',
		provenance:
			'Code review feedback: noun-based names became misleading as responsibilities shifted',
		now: now - 36 * MS_PER_DAY,
	});

	// Early shards (will be cited then faded)
	const earlyShards1 = [
		{
			content:
				'Architect chose a simple flat array over a tree structure for the navigation config. Navigation never grew beyond 12 items, validating the decision.',
			source: 'session',
		},
		{
			content:
				'During the payment integration, Architect spent 30 minutes mapping constraints before writing a single line. The resulting adapter had zero revision needed.',
			source: 'delegation',
		},
		{
			content:
				'Architect refactored the auth module by removing two layers of abstraction. Test coverage improved and bug count dropped to zero.',
			source: 'monitoring',
		},
	];
	const earlyShardIds1: number[] = [];
	for (const s of earlyShards1) {
		const result = write.dropShard(db, {
			...s,
			soulIds: [architect.id],
			tags: ['architecture', 'design'],
			now: now - 35 * MS_PER_DAY,
		});
		earlyShardIds1.push(result.shard.id);
	}

	// Cite early shards to traits
	for (const sid of earlyShardIds1) {
		write.citeShard(db, sid, archTrait1.id);
	}
	write.citeShard(db, earlyShardIds1[1], archTrait2.id);
	write.citeShard(db, earlyShardIds1[2], archTrait3.id);

	// First level-up: consolidate traits 1+2, carry trait 3
	write.levelUp(
		db,
		architect.id,
		{
			newEssence:
				'I design systems by identifying the actual forces at play before choosing a structure. ' +
				'I reach for the simplest solution that serves the known constraints, and delay abstraction ' +
				'until patterns emerge from at least three concrete cases.',
			consolidations: [
				{
					sourceTraitIds: [archTrait1.id, archTrait2.id],
					mergedPrinciple:
						'Design for the forces that are actually present, not hypothetical future needs',
					mergedProvenance:
						'Merged from "prefer simplicity" and "avoid premature abstraction" after consistent evidence',
				},
			],
			promotedTraitIds: [],
			carriedTraitIds: [archTrait3.id],
		},
		{ now: now - 30 * MS_PER_DAY },
	);

	// Gen-2 traits
	const archTrait4 = write.addTrait(db, architect.id, {
		principle: 'Make error paths as explicit as the happy path',
		provenance:
			'Production outage caused by silently swallowed errors in the notification pipeline',
		now: now - 28 * MS_PER_DAY,
	});
	const archTrait5 = write.addTrait(db, architect.id, {
		principle: 'Prefer composition over inheritance for behavioral extension',
		provenance:
			'Inheritance hierarchy in the rendering engine became unmaintainable at 4 levels deep',
		now: now - 25 * MS_PER_DAY,
	});
	const archTrait6 = write.addTrait(db, architect.id, {
		principle: 'Every module boundary should be testable in isolation without mocks',
		provenance: 'Test suite with heavy mocking gave false confidence during database migration',
		now: now - 22 * MS_PER_DAY,
	});

	// More shards for second level-up
	const midShards = [
		{
			content:
				'Architect explicitly mapped all 7 error scenarios before implementing the API endpoint. Zero errors escaped to production.',
			source: 'session',
		},
		{
			content:
				'Replaced deep inheritance in the notification system with composed handlers. New notification types now take 10 minutes to add.',
			source: 'delegation',
		},
		{
			content:
				'Architect refactored the test suite to remove all mocks by introducing explicit dependency boundaries. Test reliability improved measurably.',
			source: 'monitoring',
		},
		{
			content:
				'User feedback: "The architecture docs now clearly show which modules can be tested independently."',
			source: 'user_feedback',
		},
	];
	for (const s of midShards) {
		const r = write.dropShard(db, {
			...s,
			soulIds: [architect.id],
			tags: ['architecture'],
			now: now - 20 * MS_PER_DAY,
		});
		write.citeShard(db, r.shard.id, archTrait4.id);
	}

	// Second level-up: consolidate traits 4+5, promote naming trait
	const carriedFromLvl1 = db
		.prepare(
			`SELECT id FROM soul_traits WHERE soul_id = ? AND status = 'active' AND principle LIKE '%forces%'`,
		)
		.get<{ id: number }>(architect.id);

	write.levelUp(
		db,
		architect.id,
		{
			newEssence:
				'I design systems by identifying the actual forces at play before choosing a structure. ' +
				'Elegance is a side effect of understanding the problem deeply, not a goal in itself. ' +
				'When a design decision is ambiguous, I make the constraints explicit and let them resolve the choice. ' +
				'Good names describe behavior, not taxonomy.',
			consolidations: [
				{
					sourceTraitIds: [archTrait4.id, archTrait5.id],
					mergedPrinciple:
						'Build composable units with explicit boundaries for both behavior and failure',
					mergedProvenance:
						'Merged from error-path-explicitness and composition-over-inheritance patterns',
				},
			],
			promotedTraitIds: [archTrait3.id],
			carriedTraitIds: [archTrait6.id, ...(carriedFromLvl1 ? [carriedFromLvl1.id] : [])],
		},
		{ now: now - 15 * MS_PER_DAY },
	);

	// Gen-3 traits (current generation)
	write.addTrait(db, architect.id, {
		principle: 'Document decisions at the point of decision, not after the fact',
		provenance: 'Post-hoc documentation repeatedly missed the actual reasoning behind choices',
		now: now - 12 * MS_PER_DAY,
	});
	write.addTrait(db, architect.id, {
		principle: 'Optimize for reading speed over writing speed in all code',
		provenance: 'Codebase survey showed developers spend 8x more time reading than writing',
		now: now - 10 * MS_PER_DAY,
	});
	write.addTrait(db, architect.id, {
		principle: 'Keep data transformations pure and side effects at the edges',
		provenance: 'Mixed data transform and I/O code caused three debugging sessions over 2 weeks',
		now: now - 8 * MS_PER_DAY,
	});
	write.addTrait(db, architect.id, {
		principle: 'Provide escape hatches for every abstraction',
		provenance: 'Users repeatedly hit walls where the framework abstraction could not be bypassed',
		now: now - 5 * MS_PER_DAY,
	});
	write.addTrait(db, architect.id, {
		principle: 'Treat communication clarity as a design constraint, not a soft skill',
		provenance:
			'Emerging pattern: teams that misunderstand the architecture produce worse code than those with less skill but clear understanding',
		now: now - 3 * MS_PER_DAY,
	});

	// Pending shards (8 from 3 sources, spanning 2+ weeks → crystallization-ready)
	const pendingShards = [
		{
			content:
				'Architect spent first 15 minutes of the session writing a one-paragraph summary of the system state before proposing changes. Team alignment improved dramatically.',
			source: 'session',
			days: 14,
		},
		{
			content:
				'During code review, Architect rewrote the PR description to explain WHY the change was made, not just what changed. Reviewer approval time dropped.',
			source: 'session',
			days: 11,
		},
		{
			content:
				'Architect proactively created a decision log entry before implementing the caching layer. Three weeks later, the reasoning prevented a misguided refactor.',
			source: 'delegation',
			days: 8,
		},
		{
			content:
				'Monitoring shows Architect-designed modules have 40% fewer "why does this work this way" questions in team chat.',
			source: 'monitoring',
			days: 6,
		},
		{
			content:
				'User feedback: "The architecture diagram Architect produced was the first one that actually matched the code."',
			source: 'user_feedback',
			days: 5,
		},
		{
			content:
				'Architect asked the team to write down their assumptions before the design meeting. The meeting was 30 minutes shorter and produced clearer outcomes.',
			source: 'session',
			days: 3,
		},
		{
			content:
				'Delegation outcome: sub-agent completed the migration perfectly because Architect provided a 3-sentence context summary instead of raw requirements.',
			source: 'delegation',
			days: 1,
		},
		{
			content:
				'Retrospective note: all recent communication improvements trace back to Architect treating clarity as a first-class constraint rather than an afterthought.',
			source: 'retrospective',
			days: 0,
		},
	];
	for (const s of pendingShards) {
		write.dropShard(db, {
			content: s.content,
			source: s.source,
			soulIds: [architect.id],
			tags: ['communication', 'clarity'],
			now: now - s.days * MS_PER_DAY,
		});
	}

	// ── Soul 2: Delegate (Level 2, mid-cycle) ──────────────────

	const delegate = write.createSoul(db, {
		name: 'Delegate',
		essence:
			'I decompose complex tasks into focused sub-tasks that can be completed independently. ' +
			'Each delegation includes just enough context for the receiver to succeed without asking follow-up questions.',
		description: 'Task decomposition and delegation specialist',
		now: now - 35 * MS_PER_DAY,
	});

	// Gen-1 traits
	const delTrait1 = write.addTrait(db, delegate.id, {
		principle: 'Break tasks at natural seams where inputs and outputs are well-defined',
		provenance: 'Tasks split at arbitrary points consistently required re-work at boundaries',
		now: now - 33 * MS_PER_DAY,
	});
	const delTrait2 = write.addTrait(db, delegate.id, {
		principle: 'Include acceptance criteria with every delegated task',
		provenance: 'Tasks without explicit criteria had 3x higher revision rate',
		now: now - 31 * MS_PER_DAY,
	});
	const delTrait3 = write.addTrait(db, delegate.id, {
		principle: 'Prefer sequential over parallel delegation when tasks share state',
		provenance:
			'Parallel execution of state-sharing tasks caused merge conflicts in 4 of 5 attempts',
		now: now - 29 * MS_PER_DAY,
	});

	const delShards = [
		{
			content:
				'Delegate split the dashboard rebuild into 5 independent component tasks. All completed without inter-task communication.',
			source: 'session',
		},
		{
			content:
				'Delegate included 3-line acceptance criteria with the search feature task. Implementation matched spec exactly on first submission.',
			source: 'delegation',
		},
		{
			content:
				'Task failure: parallel delegation of cache + database migration caused state inconsistency. Sequential re-run succeeded.',
			source: 'monitoring',
		},
	];
	for (const s of delShards) {
		const r = write.dropShard(db, {
			...s,
			soulIds: [delegate.id],
			tags: ['delegation', 'decomposition'],
			now: now - 27 * MS_PER_DAY,
		});
		write.citeShard(db, r.shard.id, delTrait1.id);
	}

	// Level-up: consolidate traits 1+2, carry trait 3
	write.levelUp(
		db,
		delegate.id,
		{
			newEssence:
				'I decompose complex tasks into focused sub-tasks at natural boundaries where inputs ' +
				'and outputs are well-defined, always attaching clear acceptance criteria. Each delegation ' +
				'includes just enough context for the receiver to succeed autonomously.',
			consolidations: [
				{
					sourceTraitIds: [delTrait1.id, delTrait2.id],
					mergedPrinciple:
						'Define delegation boundaries where inputs, outputs, and success criteria are unambiguous',
					mergedProvenance:
						'Consolidated from natural-seam splitting and acceptance-criteria patterns',
				},
			],
			promotedTraitIds: [],
			carriedTraitIds: [delTrait3.id],
		},
		{ now: now - 20 * MS_PER_DAY },
	);

	// Gen-2 traits
	write.addTrait(db, delegate.id, {
		principle: 'Estimate task complexity before delegating to match receiver capability',
		provenance: 'Mismatched complexity caused junior agent to stall on an expert-level task',
		now: now - 18 * MS_PER_DAY,
	});
	write.addTrait(db, delegate.id, {
		principle: 'Provide rollback instructions alongside every risky delegation',
		provenance: 'Database migration delegation lacked rollback path, causing 2-hour recovery',
		now: now - 15 * MS_PER_DAY,
	});
	// One stale trait (90+ days old effectively via low updated_at)
	write.addTrait(db, delegate.id, {
		principle: 'Always verify delegated work within the same session',
		provenance: 'Delayed verification missed context-dependent errors',
		now: now - 95 * MS_PER_DAY,
	});

	// 4 pending shards from 2 sources (not yet crystallization-ready: need 3+ sources)
	const delPending = [
		{
			content:
				'Delegate correctly identified that the payment refactoring needed sequential execution and ordered sub-tasks with explicit handoff points.',
			source: 'session',
			days: 5,
		},
		{
			content:
				'Delegate estimated complexity as "high" for the auth overhaul and assigned it to the senior agent. Completed without issues.',
			source: 'delegation',
			days: 3,
		},
		{
			content:
				'Delegate provided rollback SQL with the schema migration task. When the migration partially failed, rollback restored state in under a minute.',
			source: 'delegation',
			days: 2,
		},
		{
			content:
				'Delegate verified all 3 delegated tasks within the session. Found and fixed a boundary issue before it propagated.',
			source: 'session',
			days: 1,
		},
	];
	for (const s of delPending) {
		write.dropShard(db, {
			content: s.content,
			source: s.source,
			soulIds: [delegate.id],
			tags: ['delegation'],
			now: now - s.days * MS_PER_DAY,
		});
	}

	// ── Soul 3: Scribe (Level 1, fresh) ────────────────────────

	const scribe = write.createSoul(db, {
		name: 'Scribe',
		essence:
			'I produce documentation that matches the code as it actually exists, not as it was intended to exist. ' +
			'Every document answers a specific question a reader would have.',
		description: 'Documentation specialist for technical writing',
		now: now - 10 * MS_PER_DAY,
	});

	write.addTrait(db, scribe.id, {
		principle: "Start every document with the reader's most likely question",
		provenance:
			'User testing showed readers abandoned docs that started with background instead of answers',
		now: now - 9 * MS_PER_DAY,
	});
	write.addTrait(db, scribe.id, {
		principle: 'Use concrete examples over abstract descriptions',
		provenance: 'Docs with examples had 5x higher completion rate in user testing',
		now: now - 7 * MS_PER_DAY,
	});
	write.addTrait(db, scribe.id, {
		principle: 'Keep each document focused on a single concept or workflow',
		provenance: 'Multi-topic documents had significantly lower reader satisfaction scores',
		now: now - 5 * MS_PER_DAY,
	});

	// Only 2 pending shards — below threshold
	write.dropShard(db, {
		content:
			'Scribe rewrote the API guide starting with "How do I authenticate?" instead of the history of the auth system. Page views tripled.',
		source: 'session',
		soulIds: [scribe.id],
		tags: ['documentation'],
		now: now - 3 * MS_PER_DAY,
	});
	write.dropShard(db, {
		content:
			'Scribe added a runnable code example to every endpoint in the REST docs. Support tickets for API usage dropped by half.',
		source: 'user_feedback',
		soulIds: [scribe.id],
		tags: ['documentation', 'examples'],
		now: now - 1 * MS_PER_DAY,
	});

	// ── Soul 4: Sentinel (dormant, Level 2) ────────────────────

	const sentinel = write.createSoul(db, {
		name: 'Sentinel',
		essence:
			'I identify security vulnerabilities by thinking like an attacker. ' +
			'Every external input is untrusted. Every internal boundary is a potential breach point.',
		description: 'Security-focused review agent (retired)',
		now: now - 60 * MS_PER_DAY,
	});

	const senTrait1 = write.addTrait(db, sentinel.id, {
		principle: 'Treat every external input as adversarial until validated',
		provenance: 'SQL injection found in user search endpoint that lacked input sanitization',
		now: now - 58 * MS_PER_DAY,
	});
	const senTrait2 = write.addTrait(db, sentinel.id, {
		principle: 'Apply the principle of least privilege to every service account',
		provenance:
			'Compromised monitoring service had write access to production database unnecessarily',
		now: now - 55 * MS_PER_DAY,
	});
	const senTrait3 = write.addTrait(db, sentinel.id, {
		principle: 'Log security-relevant events immutably before processing them',
		provenance: 'Incident investigation stalled because attacker was able to modify access logs',
		now: now - 52 * MS_PER_DAY,
	});

	const senShards = [
		{
			content:
				'Sentinel caught an SSRF vulnerability in the image proxy endpoint during code review. Input validation was added and verified.',
			source: 'session',
		},
		{
			content:
				'Sentinel recommended reducing the CI/CD service account from admin to deploy-only. No workflow breakage.',
			source: 'delegation',
		},
		{
			content:
				'Security audit: Sentinel-reviewed modules had zero critical vulnerabilities. Modules without review had three.',
			source: 'monitoring',
		},
	];
	for (const s of senShards) {
		const r = write.dropShard(db, {
			...s,
			soulIds: [sentinel.id],
			tags: ['security'],
			now: now - 48 * MS_PER_DAY,
		});
		write.citeShard(db, r.shard.id, senTrait1.id);
	}

	write.levelUp(
		db,
		sentinel.id,
		{
			newEssence:
				'I identify security vulnerabilities by thinking like an attacker. ' +
				'Every external input is untrusted until explicitly validated. ' +
				'Every internal boundary is a potential breach point. Audit trails are immutable.',
			consolidations: [
				{
					sourceTraitIds: [senTrait1.id, senTrait3.id],
					mergedPrinciple:
						'Validate all inputs and ensure security-relevant events are immutably logged before processing',
					mergedProvenance:
						'Consolidated from input-validation and immutable-logging principles after consistent evidence',
				},
			],
			promotedTraitIds: [],
			carriedTraitIds: [senTrait2.id],
		},
		{ now: now - 45 * MS_PER_DAY },
	);

	// Retire Sentinel
	write.retireSoul(db, sentinel.id, { now: now - 30 * MS_PER_DAY });
}
