import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	timeout: 60_000,
	use: {
		...devices['Desktop Chrome'],
		baseURL: 'http://localhost:4173',
	},
	webServer: {
		command: 'node scripts/serve_demo.mjs',
		url: 'http://localhost:4173',
		reuseExistingServer: false,
		timeout: 10_000,
	},
	reporter: [['list']],
});
