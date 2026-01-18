import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Auto-Copy|auto-copy/i);
  });

  test('displays main navigation', async ({ page }) => {
    await page.goto('/');

    // Check for navigation links
    await expect(page.getByRole('link', { name: /history/i })).toBeVisible();
  });

  test('has working navigation', async ({ page }) => {
    await page.goto('/');

    // Click on history link
    await page.getByRole('link', { name: /history/i }).click();
    await expect(page).toHaveURL(/\/history/);
  });
});

test.describe('Theme Toggle', () => {
  test('toggles between light and dark mode', async ({ page }) => {
    await page.goto('/');

    // Find theme toggle button
    const themeToggle = page.locator('[data-testid="theme-toggle"], button:has-text("dark"), button:has-text("light")').first();

    if (await themeToggle.isVisible()) {
      // Get initial state
      const initialClass = await page.locator('html').getAttribute('class');

      // Click toggle
      await themeToggle.click();

      // Verify class changed
      const newClass = await page.locator('html').getAttribute('class');
      expect(newClass).not.toBe(initialClass);
    }
  });
});
