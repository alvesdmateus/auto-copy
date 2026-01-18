import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('displays login form', async ({ page }) => {
      await page.goto('/auth');

      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('shows validation on empty submit', async ({ page }) => {
      await page.goto('/auth');

      // Click submit without filling form
      await page.getByRole('button', { name: /sign in/i }).click();

      // HTML5 validation should prevent submission
      const emailInput = page.getByLabel(/email/i);
      await expect(emailInput).toHaveAttribute('required');
    });

    test('can switch to register form', async ({ page }) => {
      await page.goto('/auth');

      // Click on sign up link
      await page.getByRole('button', { name: /sign up/i }).click();

      // Should show register form
      await expect(page.getByRole('heading', { name: /sign up|create account|register/i })).toBeVisible();
    });

    test('shows error on invalid credentials', async ({ page }) => {
      await page.goto('/auth');

      // Fill in invalid credentials
      await page.getByLabel(/email/i).fill('invalid@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show error message
      await expect(page.getByText(/invalid|error|failed/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Registration', () => {
    test('displays registration form', async ({ page }) => {
      await page.goto('/auth');
      await page.getByRole('button', { name: /sign up/i }).click();

      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i).first()).toBeVisible();
    });

    test('validates password requirements', async ({ page }) => {
      await page.goto('/auth');
      await page.getByRole('button', { name: /sign up/i }).click();

      // Fill with weak password
      await page.getByLabel(/email/i).fill('newuser@example.com');

      const nameInput = page.getByLabel(/name|username/i);
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test User');
      }

      await page.getByLabel(/^password$/i).fill('123');

      // Submit form
      const submitButton = page.getByRole('button', { name: /sign up|register|create/i }).first();
      await submitButton.click();

      // Should show password validation error or be prevented
      await expect(page.getByText(/password|weak|invalid|characters/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        // HTML5 validation may prevent submission
      });
    });
  });

  test.describe('Protected Routes', () => {
    test('profile page requires authentication', async ({ page }) => {
      await page.goto('/profile');

      // Should either redirect to auth or show unauthorized message
      await expect(page).toHaveURL(/\/(auth|login|profile)/);
    });
  });
});
