import { useMemo } from 'preact/hooks';
import { useAppState } from './state.tsx';

export function useDb() {
	const { db } = useAppState();
	return db;
}

export function useRefresh() {
	const { refresh } = useAppState();
	return refresh;
}

export function useAnnotation() {
	const { toast, refresh } = useAppState();
	return {
		annotate(message: string) {
			toast(message, 'ok');
			refresh();
		},
		error(message: string) {
			toast(message, 'err');
		},
	};
}

export function useLiveData<T>(factory: () => T, deps: unknown[]): T {
	const { revision } = useAppState();
	return useMemo(factory, [revision, ...deps]);
}
