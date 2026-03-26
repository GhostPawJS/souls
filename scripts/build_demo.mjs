import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as esbuild from 'esbuild';

const OUT_DIR = 'demo';
const ENTRY = 'src/demo/main.tsx';
const WATCH = process.argv.includes('--watch');

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>@ghostpaw/souls — interactive demo</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0e0e10; --fg: #e4e4e7; --muted: #71717a;
    --accent: #a78bfa; --surface: #18181b; --border: #27272a;
    --radius: 8px; --font: system-ui, -apple-system, sans-serif;
  }
  html { font-family: var(--font); background: var(--bg); color: var(--fg); }
  body { min-height: 100dvh; }
  #app { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; }
</style>
</head>
<body><div id="app"></div><script src="main.js"></script></body>
</html>`;

writeFileSync(join(OUT_DIR, 'index.html'), html);

const buildOptions = {
	entryPoints: [ENTRY],
	bundle: true,
	outfile: join(OUT_DIR, 'main.js'),
	format: 'esm',
	target: 'es2022',
	jsx: 'automatic',
	jsxImportSource: 'preact',
	define: { 'process.env.NODE_ENV': '"production"' },
	alias: {
		'node:sqlite': './src/demo/empty_module.ts',
	},
	logLevel: 'info',
};

if (WATCH) {
	const ctx = await esbuild.context(buildOptions);
	await ctx.watch();
	console.log('Watching for changes…');
} else {
	await esbuild.build(buildOptions);
}
