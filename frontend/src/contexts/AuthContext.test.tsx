import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as api from '../api/client';

// Mock the API client
vi.mock('../api/client', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  getUsageLimits: vi.fn(),
  refreshToken: vi.fn(),
  getAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
}));

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  tier: 'free' as const,
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
};

const mockUsage = {
  tier: 'free' as const,
  generation_limit: 50,
  generations_used: 10,
  generations_remaining: 40,
  reset_at: '2024-01-02T00:00:00Z',
  features: ['basic_templates', 'history'],
  locked_features: ['advanced_ai'],
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getAuthToken as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });

    it('returns initial state', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('sets user on successful login', async () => {
      (api.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        access_token: 'token',
        token_type: 'bearer',
        user: mockUser,
      });
      (api.getUsageLimits as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('throws on failed login', async () => {
      (api.login as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'wrongpassword');
        })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('sets user on successful registration', async () => {
      (api.register as ReturnType<typeof vi.fn>).mockResolvedValue({
        access_token: 'token',
        token_type: 'bearer',
        user: mockUser,
      });
      (api.getUsageLimits as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register('test@example.com', 'TestUser', 'password');
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('logout', () => {
    it('clears user on logout', async () => {
      (api.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        access_token: 'token',
        token_type: 'bearer',
        user: mockUser,
      });
      (api.getUsageLimits as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsage);
      (api.logout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Login first
      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('checkFeatureAccess', () => {
    it('returns true for available features', async () => {
      (api.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        access_token: 'token',
        token_type: 'bearer',
        user: mockUser,
      });
      (api.getUsageLimits as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.checkFeatureAccess('basic_templates')).toBe(true);
    });

    it('returns false for locked features', async () => {
      (api.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        access_token: 'token',
        token_type: 'bearer',
        user: mockUser,
      });
      (api.getUsageLimits as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.checkFeatureAccess('advanced_ai')).toBe(false);
    });
  });

  describe('canGenerate', () => {
    it('returns true when generations remaining', async () => {
      (api.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        access_token: 'token',
        token_type: 'bearer',
        user: mockUser,
      });
      (api.getUsageLimits as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsage);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.canGenerate()).toBe(true);
    });

    it('returns false when no generations remaining', async () => {
      (api.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        access_token: 'token',
        token_type: 'bearer',
        user: mockUser,
      });
      (api.getUsageLimits as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockUsage,
        generations_remaining: 0,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password');
      });

      expect(result.current.canGenerate()).toBe(false);
    });
  });
});
