import http from 'node:http';
import https from 'node:https';
import { EtherFetchError } from './errors.ts';
import type { FetchTextResult } from './types.ts';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 5;
const USER_AGENT = 'ghostpaw-souls-ether/0.1';

export function fetchText(
	url: string,
	options?: { etag?: string | null; timeoutMs?: number },
): Promise<FetchTextResult> {
	return doFetch(url, options?.etag ?? null, options?.timeoutMs ?? DEFAULT_TIMEOUT_MS, 0);
}

function doFetch(
	url: string,
	etag: string | null,
	timeoutMs: number,
	redirectCount: number,
): Promise<FetchTextResult> {
	if (redirectCount > MAX_REDIRECTS) {
		return Promise.reject(new EtherFetchError(`Too many redirects (>${MAX_REDIRECTS}).`));
	}

	return new Promise<FetchTextResult>((resolve, reject) => {
		const mod = url.startsWith('https') ? https : http;
		const headers: Record<string, string> = { 'User-Agent': USER_AGENT };
		if (etag) headers['If-None-Match'] = etag;

		const req = mod.get(url, { headers, timeout: timeoutMs }, (res) => {
			const status = res.statusCode ?? 0;

			if (status === 304) {
				res.resume();
				resolve({ body: '', etag: res.headers.etag ?? etag, status: 304 });
				return;
			}

			if (status === 301 || status === 302 || status === 307 || status === 308) {
				res.resume();
				const location = res.headers.location;
				if (!location) {
					reject(new EtherFetchError(`Redirect ${status} without Location header.`));
					return;
				}
				const next = location.startsWith('http') ? location : new URL(location, url).href;
				doFetch(next, etag, timeoutMs, redirectCount + 1).then(resolve, reject);
				return;
			}

			if (status < 200 || status >= 300) {
				res.resume();
				reject(new EtherFetchError(`HTTP ${status} for ${url}`));
				return;
			}

			let data = '';
			res.setEncoding('utf8');
			res.on('data', (chunk: string) => {
				data += chunk;
			});
			res.on('end', () => {
				resolve({
					body: data,
					etag: res.headers.etag ?? null,
					status,
				});
			});
			res.on('error', (err) => reject(new EtherFetchError(err.message)));
		});

		req.on('error', (err) => reject(new EtherFetchError(err.message)));
		req.on('timeout', () => {
			req.destroy();
			reject(new EtherFetchError(`Request timed out after ${timeoutMs}ms.`));
		});
	});
}
