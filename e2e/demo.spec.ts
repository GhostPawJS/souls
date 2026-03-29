import { expect, test } from '@playwright/test';

// Nav items have a .nav-icon span + .nav-label span inside a .nav-item button.
// Use the label text to locate them.
async function navTo(page: import('@playwright/test').Page, label: string) {
	await page.locator('.nav-item', { hasText: label }).click();
}

test.describe('Souls demo', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('networkidle');
	});

	test('loads the roster page with no console errors', async ({ page }) => {
		const errors: string[] = [];
		page.on('pageerror', (e) => errors.push(e.message));
		await expect(page.locator('h1.page-title')).toContainText('Roster');
		expect(errors).toHaveLength(0);
	});

	test('seed loads four souls and they appear on the roster', async ({ page }) => {
		await page.locator('.sidebar').getByRole('button', { name: 'Load Seeds' }).click();
		await expect(page.locator('.soul-card')).toHaveCount(4);
	});

	test('create a soul manually and land on its detail page', async ({ page }) => {
		await navTo(page, 'Create Soul');
		await expect(page.locator('h1.page-title')).toContainText('Create Soul');

		await page.locator('input.input').first().fill('Test Mage');
		await page.locator('textarea.textarea').fill(
			'A soul built for automated testing purposes.',
		);
		await page.locator('input.input').nth(1).fill(
			'Validates all the things.',
		);

		// The submit button text is "Create Soul" — be specific about context
		await page.locator('.btn-primary', { hasText: 'Create Soul' }).click();

		// Should navigate to /soul/:id
		await expect(page).toHaveURL(/#\/soul\/\d+/);
		await expect(page.locator('h1.page-title')).toContainText('Test Mage');
	});

	test('navigate to Observe, Maintenance, Search without errors', async ({ page }) => {
		for (const label of ['Observe', 'Maintenance', 'Search']) {
			await navTo(page, label);
			await expect(page.locator('h1.page-title')).toBeVisible();
		}
	});

	test('ether page loads templates and shows stats for both sources', async ({ page }) => {
		await navTo(page, 'The Ether');
		await expect(page.locator('h1.page-title')).toContainText('The Ether');

		// Wait for sql.js + ether_dump to load
		await expect(page.locator('.stat-card')).toHaveCount(3, { timeout: 30_000 });

		// Total templates should be a non-zero number
		const totalText = await page.locator('.stat-card .stat-value').first().innerText();
		expect(Number(totalText.replace(/,/g, ''))).toBeGreaterThan(0);
	});

	test('ether search returns results and clicking one opens the detail page', async ({ page }) => {
		await navTo(page, 'The Ether');

		// Wait for the DB to finish loading
		await expect(page.locator('.stat-card')).toHaveCount(3, { timeout: 30_000 });

		// Type a search query (needs 2+ chars)
		await page.locator('input.input').fill('assistant');

		// Results should appear
		await expect(page.locator('.soul-card').first()).toBeVisible({ timeout: 10_000 });
		const resultCount = await page.locator('.soul-card').count();
		expect(resultCount).toBeGreaterThan(0);

		// Click the first result
		await page.locator('.soul-card').first().click();

		// Should navigate to /ether/:id detail
		await expect(page).toHaveURL(/#\/ether\/\d+/);
		await expect(page.locator('h1.page-title')).toBeVisible();
	});
});
