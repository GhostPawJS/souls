import './sql_wasm_module.ts';

import { render } from 'preact';
import { initSoulsTables } from '../init_souls_tables.ts';
import { App } from './app.tsx';
import { BrowserSoulsDb } from './browser_db.ts';
import { loadSqlJs } from './load_sqljs.ts';
import { AppContext, useCreateAppState } from './state.tsx';

function Root({ db }: { db: BrowserSoulsDb }) {
	const state = useCreateAppState(db);
	return (
		<AppContext.Provider value={state}>
			<App />
		</AppContext.Provider>
	);
}

async function boot() {
	const app = document.getElementById('app') as HTMLElement;
	app.innerHTML = '<div class="boot-screen"><p>Initializing Soul Workshop...</p></div>';

	try {
		const SQL = await loadSqlJs();
		const raw = new SQL.Database();
		const db = new BrowserSoulsDb(raw);
		initSoulsTables(db);
		app.innerHTML = '';
		render(<Root db={db} />, app);
	} catch (err) {
		app.innerHTML = `<div class="boot-screen"><p class="boot-error">Failed to initialize: ${
			err instanceof Error ? err.message : String(err)
		}</p></div>`;
	}
}

boot();
