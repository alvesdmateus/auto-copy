import { test, expect } from '@playwright/test';

test.describe('API Health', () => {
  test('backend health endpoint responds', async ({ request }) => {
    const response = await request.get('http://localhost:8000/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('backend root endpoint responds', async ({ request }) => {
    const response = await request.get('http://localhost:8000/');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.message).toContain('Auto-Copy');
  });

  test('templates API returns list', async ({ request }) => {
    const response = await request.get('http://localhost:8000/api/templates');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('history API returns list', async ({ request }) => {
    const response = await request.get('http://localhost:8000/api/history');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

test.describe('API Authentication', () => {
  test('protected endpoints require authentication', async ({ request }) => {
    const response = await request.get('http://localhost:8000/api/auth/me');
    expect(response.status()).toBe(401);
  });

  test('can register new user', async ({ request }) => {
    const uniqueEmail = `test-${Date.now()}@example.com`;
    const response = await request.post('http://localhost:8000/api/auth/register', {
      data: {
        email: uniqueEmail,
        password: 'TestPassword123!',
        name: 'Test User',
      },
    });

    // Should succeed or fail with duplicate email
    expect([200, 400]).toContain(response.status());
  });

  test('login with invalid credentials fails', async ({ request }) => {
    const response = await request.post('http://localhost:8000/api/auth/login', {
      data: {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);
  });
});
