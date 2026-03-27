#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import https from 'node:https';
import { join } from 'node:path';

const OUT_DIR = join('src', 'demo');
const OUT_FILE = join(OUT_DIR, 'ether_dump.json');

const SOURCES = [
	{
		id: 'awesome-chatgpt-prompts',
		url: 'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv',
		kind: 'csv',
	},
	{
		id: 'rosehill-system-prompts',
		url: 'https://raw.githubusercontent.com/danielrosehill/System-Prompt-Library/main/index/index.json',
		kind: 'json',
	},
];

function fetchUrl(url) {
	return new Promise((resolve, reject) => {
		const get = url.startsWith('https') ? https.get : https.get;
		get(url, { headers: { 'User-Agent': 'ghostpaw-souls-ether/0.1' } }, (res) => {
			if (res.statusCode === 301 || res.statusCode === 302) {
				fetchUrl(res.headers.location).then(resolve, reject);
				return;
			}
			if (res.statusCode !== 200) {
				reject(new Error(`HTTP ${res.statusCode} for ${url}`));
				return;
			}
			let data = '';
			res.setEncoding('utf8');
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => resolve(data));
			res.on('error', reject);
		}).on('error', reject);
	});
}

function parseCsvRows(text) {
	const entries = [];
	let pos = 0;
	let headers = null;

	while (pos < text.length) {
		const { fields, next } = parseRow(text, pos);
		pos = next;
		if (fields.length === 0 || (fields.length === 1 && fields[0] === '')) continue;
		if (!headers) {
			headers = fields.map((h) => h.trim());
			continue;
		}
		const record = {};
		for (let i = 0; i < headers.length; i++) {
			record[headers[i]] = i < fields.length ? fields[i] : '';
		}

		const name = (record.act || '').trim();
		const content = (record.prompt || '').trim();
		if (!name || !content) continue;

		entries.push({
			name,
			description: '',
			content,
			source: 'awesome-chatgpt-prompts',
			category: (record.type || '').trim() || null,
			tags: null,
		});
	}
	return entries;
}

function parseRow(text, start) {
	const fields = [];
	let pos = start;
	while (pos < text.length) {
		if (text[pos] === '"') {
			const r = parseQuoted(text, pos);
			fields.push(r.value);
			pos = r.next;
		} else {
			let end = pos;
			while (end < text.length && text[end] !== ',' && text[end] !== '\n' && text[end] !== '\r')
				end++;
			fields.push(text.slice(pos, end));
			pos = end;
		}
		if (pos >= text.length || text[pos] === '\n' || text[pos] === '\r') {
			if (text[pos] === '\r') pos++;
			if (pos < text.length && text[pos] === '\n') pos++;
			break;
		}
		if (text[pos] === ',') pos++;
	}
	return { fields, next: pos };
}

function parseQuoted(text, start) {
	let pos = start + 1;
	let value = '';
	while (pos < text.length) {
		if (text[pos] === '"') {
			if (pos + 1 < text.length && text[pos + 1] === '"') {
				value += '"';
				pos += 2;
			} else {
				pos++;
				break;
			}
		} else {
			value += text[pos];
			pos++;
		}
	}
	return { value, next: pos };
}

function parseRosehillJson(text) {
	const data = JSON.parse(text);
	const entries = [];
	for (const p of data.prompts || []) {
		const systemPrompt = p.full_data?.['System Prompt'];
		if (!systemPrompt || typeof systemPrompt !== 'string' || !systemPrompt.trim()) continue;
		const name = (p.agent_name || '').trim();
		if (!name) continue;

		entries.push({
			name,
			description: (p.description || '').trim(),
			content: systemPrompt.trim(),
			source: 'rosehill-system-prompts',
			category: p.features?.is_agent ? 'agent' : null,
			tags: null,
		});
	}
	return entries;
}

async function main() {
	await mkdir(OUT_DIR, { recursive: true });
	const allEntries = [];

	for (const src of SOURCES) {
		console.log(`[ether] fetching ${src.id} ...`);
		const body = await fetchUrl(src.url);

		let entries;
		if (src.kind === 'csv') {
			entries = parseCsvRows(body);
		} else {
			entries = parseRosehillJson(body);
		}
		console.log(`[ether] ${src.id}: ${entries.length} entries`);
		allEntries.push(...entries);
	}

	await writeFile(OUT_FILE, JSON.stringify(allEntries));
	const sizeMb = (Buffer.byteLength(JSON.stringify(allEntries)) / 1024 / 1024).toFixed(2);
	console.log(`[ether] wrote ${OUT_FILE} (${allEntries.length} entries, ${sizeMb} MB)`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
