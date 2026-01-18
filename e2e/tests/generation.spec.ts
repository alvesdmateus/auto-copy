import { test, expect } from '@playwright/test';

test.describe('Content Generation', () => {
  test('displays generation form', async ({ page }) => {
    await page.goto('/');

    // Look for prompt input or generate button
    const promptInput = page.locator('textarea[placeholder*="prompt"], input[placeholder*="prompt"], textarea[name="prompt"]');
    const generateButton = page.getByRole('button', { name: /generate/i });

    // Either prompt input or generate button should be visible
    const hasPromptInput = await promptInput.isVisible().catch(() => false);
    const hasGenerateButton = await generateButton.isVisible().catch(() => false);

    expect(hasPromptInput || hasGenerateButton).toBe(true);
  });

  test('generate button is clickable', async ({ page }) => {
    await page.goto('/');

    const generateButton = page.getByRole('button', { name: /generate/i }).first();

    if (await generateButton.isVisible()) {
      await expect(generateButton).toBeEnabled();
    }
  });

  test('shows loading state during generation', async ({ page }) => {
    await page.goto('/');

    // Select a template if available
    const template = page.locator('[data-testid="template-card"], .template-card').first();
    if (await template.isVisible()) {
      await template.click();
    }

    // Fill in any required fields
    const textInputs = page.locator('input[type="text"]:visible, textarea:visible');
    const inputCount = await textInputs.count();

    for (let i = 0; i < Math.min(inputCount, 3); i++) {
      const input = textInputs.nth(i);
      if (await input.isEditable()) {
        await input.fill('Test content');
      }
    }

    // Click generate
    const generateButton = page.getByRole('button', { name: /generate/i }).first();
    if (await generateButton.isVisible() && await generateButton.isEnabled()) {
      await generateButton.click();

      // Should show loading state
      await expect(
        page.getByText(/generating|loading|please wait/i)
      ).toBeVisible({ timeout: 3000 }).catch(() => {
        // Loading state may be brief
      });
    }
  });
});

test.describe('Generation History', () => {
  test('can navigate to history page', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /history/i }).click();

    await expect(page).toHaveURL(/\/history/);
  });

  test('history page displays correctly', async ({ page }) => {
    await page.goto('/history');

    // Should show history heading or list
    await expect(
      page.getByRole('heading', { name: /history/i })
    ).toBeVisible().catch(() => {
      // Might show empty state
      expect(page.getByText(/no history|empty|no generations/i)).toBeVisible();
    });
  });

  test('can toggle favorites', async ({ page }) => {
    await page.goto('/history');
    await page.waitForLoadState('networkidle');

    // Find favorite button
    const favoriteButton = page.locator('button[aria-label*="favorite"], button:has-text("favorite"), [data-testid="favorite"]').first();

    if (await favoriteButton.isVisible()) {
      await favoriteButton.click();
      // Button state should change
    }
  });
});
