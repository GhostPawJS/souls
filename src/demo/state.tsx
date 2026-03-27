import { createContext } from 'preact';
import { useCallback, useContext, useRef, useState } from 'preact/hooks';
import type { SoulsDb } from '../database.ts';

export interface Toast {
	id: number;
	message: string;
	variant: 'ok' | 'err';
}

export interface AppState {
	db: SoulsDb;
	revision: number;
	refresh: () => void;
	toasts: Toast[];
	toast: (message: string, variant?: 'ok' | 'err') => void;
	dismissToast: (id: number) => void;
	guidesOpen: boolean;
	toggleGuides: () => void;
}

export const AppContext = createContext<AppState>(null as unknown as AppState);

export function useAppState(): AppState {
	return useContext(AppContext);
}

export function useCreateAppState(db: SoulsDb): AppState {
	const [revision, setRevision] = useState(0);
	const [toasts, setToasts] = useState<Toast[]>([]);
	const [guidesOpen, setGuidesOpen] = useState(true);
	const nextId = useRef(0);

	const refresh = useCallback(() => {
		setRevision((r) => r + 1);
	}, []);

	const toast = useCallback((message: string, variant: 'ok' | 'err' = 'ok') => {
		const id = ++nextId.current;
		setToasts((prev) => [...prev, { id, message, variant }]);
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 6000);
	}, []);

	const dismissToast = useCallback((id: number) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const toggleGuides = useCallback(() => {
		setGuidesOpen((g) => !g);
	}, []);

	return { db, revision, refresh, toasts, toast, dismissToast, guidesOpen, toggleGuides };
}
