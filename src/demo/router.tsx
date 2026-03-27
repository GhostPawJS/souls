import { useEffect, useState } from 'preact/hooks';

export interface RouteMatch {
	path: string;
	params: Record<string, string>;
}

export function useRoute(): RouteMatch {
	const [hash, setHash] = useState(location.hash);

	useEffect(() => {
		const onHash = () => setHash(location.hash);
		window.addEventListener('hashchange', onHash);
		return () => window.removeEventListener('hashchange', onHash);
	}, []);

	const path = hash.replace(/^#\/?/, '/').replace(/\/$/, '') || '/';
	return { path, params: {} };
}

export function matchRoute(current: string, pattern: string): Record<string, string> | null {
	const currentParts = current.split('/').filter(Boolean);
	const patternParts = pattern.split('/').filter(Boolean);

	if (currentParts.length !== patternParts.length) return null;

	const params: Record<string, string> = {};
	for (let i = 0; i < patternParts.length; i++) {
		const pp = patternParts[i];
		if (pp.startsWith(':')) {
			params[pp.slice(1)] = currentParts[i];
		} else if (pp !== currentParts[i]) {
			return null;
		}
	}
	return params;
}

export function navigate(path: string): void {
	location.hash = `#${path}`;
}
