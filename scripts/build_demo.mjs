#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import * as esbuild from 'esbuild';

const OUT_DIR = 'demo';
const ENTRY = 'src/demo/main.tsx';
const WATCH = process.argv.includes('--watch');
const EMPTY_MODULE = resolve('src/demo/empty_module.ts');

/** @type {import("esbuild").BuildOptions} */
const buildOptions = {
	entryPoints: [ENTRY],
	outdir: OUT_DIR,
	bundle: true,
	format: 'esm',
	platform: 'browser',
	target: ['es2022'],
	sourcemap: true,
	jsx: 'automatic',
	jsxImportSource: 'preact',
	loader: { '.wasm': 'file' },
	entryNames: 'app',
	assetNames: 'assets/[name]-[hash]',
	alias: {
		'node:sqlite': EMPTY_MODULE,
		'node:https': EMPTY_MODULE,
		'node:http': EMPTY_MODULE,
		fs: EMPTY_MODULE,
		path: EMPTY_MODULE,
	},
};

const CSS = /* css */ `
/* ── Design Tokens ─────────────────────────────────────────────── */
:root {
	color-scheme: dark;
	--bg-base: #08080f;
	--bg-surface: rgba(16, 14, 28, 0.88);
	--bg-elevated: rgba(28, 22, 48, 0.75);
	--bg-input: rgba(10, 8, 20, 0.95);
	--border: rgba(168, 85, 247, 0.18);
	--border-strong: rgba(168, 85, 247, 0.35);
	--accent: #a855f7;
	--accent-text: #c084fc;
	--accent-dim: rgba(168, 85, 247, 0.14);
	--accent-glow: rgba(168, 85, 247, 0.30);
	--success: #34d399;
	--warn: #fbbf24;
	--danger: #f87171;
	--text-primary: #ede9fe;
	--text-secondary: #a1a1aa;
	--font-display: ui-monospace, "SF Mono", "Cascadia Mono", "Fira Code", "Consolas", monospace;
	--font-body: system-ui, -apple-system, "Segoe UI", sans-serif;
	--sidebar-w: 240px;
	--radius-sm: 8px;
	--radius-md: 14px;
	--radius-lg: 18px;
}

/* ── Reset ─────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; min-width: 0; }
html { overflow-x: hidden; }
html, body { min-height: 100vh; min-height: 100dvh; }
body {
	font-family: var(--font-body);
	font-size: 0.92rem;
	font-weight: 400;
	line-height: 1.6;
	color: var(--text-primary);
	overflow-wrap: break-word;
	-webkit-font-smoothing: antialiased;
	background:
		radial-gradient(ellipse at 15% 10%, rgba(168, 85, 247, 0.08), transparent 50%),
		radial-gradient(ellipse at 85% 90%, rgba(52, 211, 153, 0.05), transparent 40%),
		var(--bg-base);
}
a { color: var(--accent-text); text-decoration: none; }
a:hover { text-decoration: underline; }
button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }
input, textarea, select { font-family: inherit; color: inherit; max-width: 100%; }
img { max-width: 100%; display: block; }

/* ── Focus ─────────────────────────────────────────────────────── */
:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

/* ── Typography ────────────────────────────────────────────────── */
.page-title {
	font-family: var(--font-display);
	font-weight: 700;
	font-size: clamp(1.1rem, 3vw, 1.5rem);
	letter-spacing: 0.04em;
	line-height: 1.3;
	margin-bottom: 20px;
}
h2, .panel-title {
	font-family: var(--font-display);
	font-weight: 600;
	font-size: clamp(0.85rem, 2.5vw, 1.05rem);
	letter-spacing: 0.03em;
	line-height: 1.35;
}
h3 { font-family: var(--font-body); font-weight: 600; font-size: 0.9rem; line-height: 1.4; }
.muted { color: var(--text-secondary); }
.accent-text { color: var(--accent-text); }
.mono { font-family: var(--font-display); }

/* ── Layout ────────────────────────────────────────────────────── */
#app { min-height: 100vh; }
.boot-screen {
	display: flex; align-items: center; justify-content: center;
	min-height: 100vh; padding: 20px; text-align: center;
	font-family: var(--font-display); font-size: 0.95rem;
}
.boot-error { color: var(--danger); }
.main-content {
	margin-left: var(--sidebar-w);
	min-height: 100vh;
	padding: 32px 28px 80px;
	overflow-x: hidden;
}
.main-content > .page {
	max-width: 860px;
	margin: 0 auto;
	display: grid;
	gap: 20px;
}

/* ── Sidebar ───────────────────────────────────────────────────── */
.sidebar {
	position: fixed;
	top: 0; left: 0;
	width: var(--sidebar-w);
	height: 100vh;
	overflow-y: auto;
	background: var(--bg-surface);
	backdrop-filter: blur(20px);
	border-right: 1px solid var(--border);
	display: flex;
	flex-direction: column;
	z-index: 100;
	padding: 24px 0;
}
.sidebar-backdrop { display: none; }
.hamburger { display: none; }

.sidebar-brand {
	display: flex; align-items: center; gap: 12px;
	padding: 0 20px 24px;
	border-bottom: 1px solid var(--border);
	margin-bottom: 16px;
}
.sidebar-logo {
	display: flex; align-items: center; justify-content: center;
	width: 36px; height: 36px;
	border-radius: 10px;
	background: var(--accent-dim);
	border: 1px solid var(--accent);
	font-family: var(--font-display);
	font-size: 1.1rem;
	font-weight: 700;
	color: var(--accent-text);
}
.sidebar-title {
	font-family: var(--font-display);
	font-weight: 700;
	font-size: 0.9rem;
	letter-spacing: 0.04em;
	color: var(--text-primary);
}

.sidebar-nav {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: 0 10px;
}
.nav-item {
	display: flex; align-items: center; gap: 12px;
	padding: 10px 14px;
	border-radius: 10px;
	font-size: 0.88rem;
	font-weight: 500;
	transition: background 0.15s ease;
	min-height: 44px;
	text-align: left;
	width: 100%;
}
.nav-item:hover { background: var(--accent-dim); }
.nav-active { background: var(--accent-dim); color: var(--accent-text); }
.nav-icon {
	font-family: var(--font-display);
	font-size: 0.9rem;
	width: 24px;
	text-align: center;
	flex-shrink: 0;
	color: var(--accent-text);
}
.nav-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nav-badge {
	display: inline-flex; align-items: center; justify-content: center;
	min-width: 22px; height: 22px;
	padding: 0 6px;
	border-radius: 999px;
	background: var(--accent);
	color: var(--bg-base);
	font-size: 0.72rem;
	font-weight: 700;
}

.sidebar-footer {
	padding: 16px 16px 0;
	border-top: 1px solid var(--border);
	margin-top: 12px;
	display: grid; gap: 8px;
}
.sidebar-btn-row { display: flex; gap: 8px; flex-wrap: wrap; }

/* ── Panel (glassmorphic) ──────────────────────────────────────── */
.panel {
	padding: clamp(14px, 3vw, 24px);
	border: 1px solid var(--border);
	border-radius: var(--radius-lg);
	background: var(--bg-surface);
	backdrop-filter: blur(16px);
	min-width: 0;
}
.panel-header {
	display: flex; justify-content: space-between; align-items: flex-start;
	gap: 12px;
	margin-bottom: 16px;
}
.panel-subtitle { color: var(--text-secondary); font-size: 0.82rem; margin-top: 4px; }
.panel-body { display: grid; gap: 14px; }

/* ── Badges ────────────────────────────────────────────────────── */
.badge {
	display: inline-flex; align-items: center;
	padding: 3px 10px;
	border-radius: 999px;
	font-size: 0.75rem;
	font-weight: 600;
	letter-spacing: 0.02em;
	white-space: nowrap;
	line-height: 1.4;
}
.badge-accent { background: var(--accent-dim); color: var(--accent-text); border: 1px solid rgba(168,85,247,0.25); }
.badge-success { background: rgba(52,211,153,0.14); color: var(--success); border: 1px solid rgba(52,211,153,0.25); }
.badge-warn { background: rgba(251,191,36,0.14); color: var(--warn); border: 1px solid rgba(251,191,36,0.25); }
.badge-danger { background: rgba(248,113,113,0.14); color: var(--danger); border: 1px solid rgba(248,113,113,0.25); }
.badge-muted { background: rgba(161,161,170,0.1); color: var(--text-secondary); border: 1px solid rgba(161,161,170,0.15); }

.level-badge {
	display: inline-flex; align-items: center; justify-content: center;
	width: 32px; height: 32px;
	border-radius: 50%;
	border: 2px solid var(--accent);
	background: var(--accent-dim);
	font-family: var(--font-display);
	font-size: 0.85rem;
	font-weight: 700;
	color: var(--accent-text);
	flex-shrink: 0;
}
.level-badge-sm { width: 26px; height: 26px; font-size: 0.72rem; }
.level-badge-lg { width: 44px; height: 44px; font-size: 1.1rem; }

/* ── Bars ──────────────────────────────────────────────────────── */
.bar-wrap { display: flex; align-items: center; gap: 10px; min-width: 0; }
.bar-track {
	flex: 1; height: 8px; border-radius: 4px;
	background: rgba(255,255,255,0.06);
	overflow: hidden; min-width: 40px;
}
.bar-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease-out; background: var(--accent); }
.bar-fill-full { background: linear-gradient(90deg, var(--accent), var(--warn)); }
.bar-label {
	font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);
	flex-shrink: 0; min-width: 36px; text-align: right;
}
.bar-ctx {
	font-size: 0.72rem; color: var(--text-secondary); margin-top: 2px;
}

/* ── Soul Card ─────────────────────────────────────────────────── */
.soul-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
	gap: 16px;
}
.soul-card {
	padding: clamp(14px, 3vw, 20px);
	border: 1px solid var(--border);
	border-radius: var(--radius-lg);
	background: var(--bg-surface);
	backdrop-filter: blur(16px);
	cursor: pointer;
	transition: transform 0.15s ease, box-shadow 0.15s ease;
	min-height: 120px;
}
.soul-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
.soul-card-ready {
	animation: breathe 3s ease-in-out infinite;
}
@keyframes breathe {
	0%, 100% { box-shadow: 0 0 12px var(--accent-glow); }
	50% { box-shadow: 0 0 24px var(--accent-glow); }
}
.soul-card-dormant {
	filter: grayscale(0.6);
	opacity: 0.6;
}
.soul-card-header {
	display: flex; align-items: center; gap: 12px;
	margin-bottom: 12px;
}
.soul-card-name {
	flex: 1;
	font-family: var(--font-display);
	font-weight: 700;
	font-size: 1rem;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.soul-card-desc {
	font-size: 0.82rem;
	color: var(--text-secondary);
	margin-bottom: 12px;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
.soul-card-stats {
	display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}

/* ── Trait Card ────────────────────────────────────────────────── */
.trait-card {
	padding: 14px 16px;
	border: 1px solid var(--border);
	border-radius: var(--radius-md);
	background: var(--bg-elevated);
	cursor: pointer;
	transition: background 0.15s ease;
}
.trait-card:hover { background: rgba(28, 22, 48, 0.9); }
.trait-card-stale { border-left: 3px solid var(--warn); }
.trait-principle {
	font-weight: 500;
	font-size: 0.92rem;
	line-height: 1.5;
	margin-bottom: 4px;
}
.trait-provenance {
	font-size: 0.82rem;
	color: var(--text-secondary);
	line-height: 1.5;
	margin-top: 8px;
	padding-top: 8px;
	border-top: 1px solid var(--border);
}
.trait-meta {
	display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 8px;
}

/* ── Shard Card ────────────────────────────────────────────────── */
.shard-card {
	padding: 14px 16px;
	border: 1px solid var(--border);
	border-radius: var(--radius-md);
	background: var(--bg-elevated);
	cursor: pointer;
	transition: background 0.15s ease;
}
.shard-card:hover { background: rgba(28, 22, 48, 0.9); }
.shard-content {
	font-size: 0.88rem;
	line-height: 1.6;
	margin-bottom: 8px;
}
.shard-content-collapsed {
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
.shard-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.shard-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }

/* ── Buttons ───────────────────────────────────────────────────── */
.btn {
	display: inline-flex; align-items: center; justify-content: center; gap: 6px;
	min-height: 44px;
	padding: 8px 16px;
	border-radius: var(--radius-sm);
	font-size: 0.85rem;
	font-weight: 600;
	border: 1px solid var(--border);
	transition: transform 0.1s ease, background 0.15s ease;
}
.btn:active { transform: scale(0.97); }
.btn-sm { min-height: 36px; padding: 4px 12px; font-size: 0.78rem; }
.btn-primary { background: var(--accent); color: var(--bg-base); border-color: var(--accent); }
.btn-primary:hover { background: #9333ea; }
.btn-success { border-color: var(--success); color: var(--success); }
.btn-success:hover { background: rgba(52,211,153,0.12); }
.btn-warn { border-color: var(--warn); color: var(--warn); }
.btn-warn:hover { background: rgba(251,191,36,0.12); }
.btn-danger { border-color: var(--danger); color: var(--danger); }
.btn-danger:hover { background: rgba(248,113,113,0.12); }
.btn-muted { border-color: var(--border); color: var(--text-secondary); }
.btn-muted:hover { background: rgba(161,161,170,0.08); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* ── Form inputs ───────────────────────────────────────────────── */
.input, .textarea {
	width: 100%;
	padding: 10px 14px;
	border: 1px solid var(--border);
	border-radius: var(--radius-sm);
	background: var(--bg-input);
	color: var(--text-primary);
	font-size: 0.92rem;
	line-height: 1.5;
	transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.textarea { resize: vertical; min-height: 80px; }
.input:focus, .textarea:focus {
	border-color: var(--accent);
	box-shadow: 0 0 0 2px var(--accent-dim);
	outline: none;
}
.form-field { display: grid; gap: 6px; }
.form-label {
	font-size: 0.78rem; font-weight: 600;
	letter-spacing: 0.03em; text-transform: uppercase;
	color: var(--text-secondary);
}

/* ── Pill Selector ─────────────────────────────────────────────── */
.pill-row { display: flex; flex-wrap: wrap; gap: 8px; }
.pill-btn {
	padding: 6px 14px;
	border: 1px solid var(--border);
	border-radius: 999px;
	font-size: 0.8rem;
	font-weight: 500;
	min-height: 36px;
	transition: all 0.15s ease;
}
.pill-btn:hover { background: var(--accent-dim); }
.pill-active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent-text); }

/* ── Checkbox ──────────────────────────────────────────────────── */
.check-row {
	display: flex; align-items: center; gap: 8px;
	min-height: 36px; cursor: pointer;
	font-size: 0.88rem;
}
.check-box {
	width: 18px; height: 18px;
	border: 2px solid var(--border);
	border-radius: 4px;
	display: flex; align-items: center; justify-content: center;
	flex-shrink: 0;
	transition: all 0.15s ease;
	font-size: 0.7rem;
}
.check-box-on { background: var(--accent); border-color: var(--accent); color: var(--bg-base); }

/* ── Tabs ──────────────────────────────────────────────────────── */
.tab-row {
	display: flex; gap: 0; border-bottom: 1px solid var(--border);
	margin-bottom: 16px; overflow-x: auto;
}
.tab-btn {
	padding: 10px 16px;
	font-size: 0.82rem; font-weight: 600;
	border-bottom: 2px solid transparent;
	transition: all 0.15s ease;
	white-space: nowrap;
	min-height: 44px;
}
.tab-btn:hover { color: var(--accent-text); }
.tab-active { border-bottom-color: var(--accent); color: var(--accent-text); }

/* ── Empty State ───────────────────────────────────────────────── */
.empty-state {
	display: flex; flex-direction: column; align-items: center;
	padding: 48px 24px; text-align: center;
}
.empty-glyph {
	font-family: var(--font-display);
	font-size: 2.5rem;
	margin-bottom: 16px;
	opacity: 0.4;
	color: var(--accent-text);
}
.empty-title { font-weight: 600; font-size: 1rem; margin-bottom: 6px; }
.empty-subtitle { color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 20px; }

/* ── Stat Card ─────────────────────────────────────────────────── */
.stat-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 140px), 1fr));
	gap: 12px;
}
.stat-card {
	padding: 14px 16px;
	border: 1px solid var(--border);
	border-radius: var(--radius-md);
	background: var(--bg-elevated);
	text-align: center;
}
.stat-value {
	display: block;
	font-family: var(--font-display);
	font-size: 1.5rem;
	font-weight: 700;
	line-height: 1.2;
	margin-bottom: 4px;
}
.stat-label {
	font-size: 0.72rem; font-weight: 600;
	letter-spacing: 0.03em; text-transform: uppercase;
	color: var(--text-secondary);
}
.stat-sublabel { font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px; }

/* ── Health Ring ───────────────────────────────────────────────── */
.health-ring {
	position: relative;
	display: inline-flex;
	align-items: center; justify-content: center;
}
.health-ring svg { width: 100%; height: 100%; }
.health-ring-track { fill: none; stroke: rgba(255,255,255,0.06); }
.health-ring-fill { fill: none; transition: stroke-dashoffset 0.6s ease-out; }
.health-ring-label {
	position: absolute;
	font-family: var(--font-display);
	font-weight: 700;
	letter-spacing: 0.03em;
}

/* ── Explainer ─────────────────────────────────────────────────── */
.explainer {
	padding: 12px 16px;
	border-radius: var(--radius-sm);
	background: var(--accent-dim);
	border: 1px solid rgba(168,85,247,0.2);
	font-size: 0.84rem;
	line-height: 1.6;
	color: var(--text-secondary);
}
.explainer-toggle {
	font-size: 0.78rem; font-weight: 600;
	color: var(--accent-text);
	margin-top: 6px;
	min-height: 28px;
}
.explainer-detail { margin-top: 8px; }

/* ── Toast ─────────────────────────────────────────────────────── */
.toast-stack {
	position: fixed;
	right: 16px; bottom: 16px;
	z-index: 200;
	display: flex; flex-direction: column; gap: 8px;
	max-width: min(360px, calc(100vw - 32px));
	pointer-events: none;
}
.toast {
	padding: 12px 18px;
	border-radius: var(--radius-sm);
	font-size: 0.84rem;
	font-weight: 500;
	line-height: 1.5;
	backdrop-filter: blur(12px);
	animation: slideInRight 0.3s ease-out;
	pointer-events: auto;
	overflow-wrap: break-word;
}
.toast-ok {
	background: var(--accent-dim);
	border: 1px solid rgba(168,85,247,0.35);
	color: var(--accent-text);
}
.toast-err {
	background: rgba(248,113,113,0.18);
	border: 1px solid rgba(248,113,113,0.35);
	color: var(--danger);
}
@keyframes slideInRight {
	from { transform: translateX(100%); opacity: 0; }
	to { transform: translateX(0); opacity: 1; }
}

/* ── Condition Check ───────────────────────────────────────────── */
.condition-row {
	display: flex; align-items: center; gap: 10px;
	padding: 8px 0;
	font-size: 0.88rem;
}
.condition-icon { font-family: var(--font-display); font-size: 0.85rem; flex-shrink: 0; width: 20px; text-align: center; }
.condition-pass { color: var(--success); }
.condition-fail { color: var(--danger); }
.condition-label { flex: 1; }
.condition-value { font-family: var(--font-display); font-size: 0.82rem; color: var(--text-secondary); flex-shrink: 0; }

/* ── Timeline ──────────────────────────────────────────────────── */
.timeline {
	display: grid; gap: 0;
	padding-left: 16px;
	border-left: 2px solid var(--border);
}
.timeline-node {
	display: flex; align-items: flex-start; gap: 12px;
	padding: 12px 0;
	position: relative;
}
.timeline-marker {
	width: 12px; height: 12px;
	border-radius: 50%;
	border: 2px solid var(--accent);
	background: var(--bg-base);
	flex-shrink: 0;
	margin-top: 4px;
	margin-left: -23px;
}
.timeline-marker-current { background: var(--accent); }
.timeline-body { display: grid; gap: 4px; min-width: 0; }
.timeline-title {
	font-family: var(--font-display);
	font-size: 0.88rem;
	font-weight: 600;
}
.timeline-time { font-size: 0.75rem; color: var(--text-secondary); }

/* ── Diff ──────────────────────────────────────────────────────── */
.diff-before {
	padding: 8px 12px; border-radius: 6px;
	background: rgba(248,113,113,0.1);
	border-left: 3px solid var(--danger);
	text-decoration: line-through;
	color: var(--danger);
	font-size: 0.82rem;
	overflow-wrap: break-word;
}
.diff-after {
	padding: 8px 12px; border-radius: 6px;
	background: rgba(52,211,153,0.1);
	border-left: 3px solid var(--success);
	color: var(--success);
	font-size: 0.82rem;
	overflow-wrap: break-word;
}

/* ── Identity Block ────────────────────────────────────────────── */
.identity-block {
	font-family: var(--font-display);
	font-size: 0.82rem;
	line-height: 1.7;
	padding: clamp(14px, 3vw, 20px);
	border-radius: var(--radius-md);
	background: var(--bg-elevated);
	border: 1px solid var(--border);
	white-space: pre-wrap;
	overflow-wrap: break-word;
}

/* ── Split Layout ──────────────────────────────────────────────── */
.split-layout {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 20px;
}

/* ── Confirm Dialog ────────────────────────────────────────────── */
.confirm-inline {
	display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
	padding: 10px 14px;
	border-radius: var(--radius-sm);
	background: rgba(248,113,113,0.08);
	border: 1px solid rgba(248,113,113,0.2);
	font-size: 0.85rem;
}

/* ── Distribution Bar ──────────────────────────────────────────── */
.dist-track {
	display: flex; height: 24px;
	border-radius: 6px; overflow: hidden;
	background: rgba(255,255,255,0.04);
}
.dist-segment { min-width: 4px; transition: width 0.3s ease; }
.dist-legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
.dist-legend-item {
	display: inline-flex; align-items: center; gap: 6px;
	font-size: 0.75rem; color: var(--text-secondary);
}
.dist-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* ── Celebrate ─────────────────────────────────────────────────── */
.celebrate { animation: celebrate 0.6s ease-out; }
@keyframes celebrate {
	0% { transform: scale(1); }
	30% { transform: scale(1.15); box-shadow: 0 0 30px var(--accent-glow); }
	100% { transform: scale(1); }
}

/* ── Responsive: tablet ────────────────────────────────────────── */
@media (max-width: 900px) {
	.sidebar {
		transform: translateX(-100%);
		transition: transform 0.25s ease;
		box-shadow: none;
	}
	.sidebar-open { transform: translateX(0); box-shadow: 8px 0 32px rgba(0,0,0,0.5); }
	.sidebar-backdrop {
		display: block;
		position: fixed; inset: 0;
		z-index: 99;
		background: rgba(0,0,0,0.5);
	}
	.hamburger {
		display: flex; align-items: center; justify-content: center;
		position: fixed;
		top: 14px; left: 14px;
		z-index: 101;
		width: 44px; height: 44px;
		border-radius: 10px;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		font-family: var(--font-display);
		font-size: 1.1rem;
		color: var(--text-primary);
	}
	.main-content {
		margin-left: 0;
		padding: 64px 16px 80px;
	}
	.split-layout { grid-template-columns: 1fr; }
}

/* ── Responsive: mobile ────────────────────────────────────────── */
@media (max-width: 600px) {
	.main-content { padding: 60px 12px 80px; }
	.panel { padding: clamp(12px, 3vw, 18px); }
	.soul-card { padding: clamp(12px, 3vw, 16px); }
	.soul-grid { grid-template-columns: 1fr; }
	.page-title { font-size: 1rem; }
	.pill-btn { padding: 5px 10px; font-size: 0.75rem; }
	.tab-btn { padding: 8px 10px; font-size: 0.78rem; }
}

/* ── Responsive: narrow phones ────────────────────────────────── */
@media (max-width: 380px) {
	.main-content { padding: 56px 8px 72px; }
	.stat-card { padding: 10px 12px; }
	.stat-value { font-size: 1.2rem; }
	.stat-label { font-size: 0.68rem; }
}
`;

function writeHtmlShell() {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Soul Workshop — @ghostpaw/souls</title>
<style>${CSS}</style>
</head>
<body>
<div id="app"></div>
<script src="app.js"></script>
</body>
</html>`;
}

async function main() {
	await mkdir(OUT_DIR, { recursive: true });

	if (WATCH) {
		const ctx = await esbuild.context(buildOptions);
		await ctx.watch();
		console.log('[demo] watching for changes ...');
	} else {
		await esbuild.build(buildOptions);
		console.log('[demo] build complete');
	}

	await writeFile(join(OUT_DIR, 'index.html'), writeHtmlShell());
	console.log('[demo] wrote index.html');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
