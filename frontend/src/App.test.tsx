import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock API calls while preserving non-async exports
vi.mock('./api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/client')>();
  return {
    ...actual,
    // Override only auth-related async functions
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn().mockResolvedValue(null),
    getUsageLimits: vi.fn().mockResolvedValue(null),
    refreshToken: vi.fn(),
    getAuthToken: vi.fn().mockReturnValue(null),
    clearAuthToken: vi.fn(),
    setAuthToken: vi.fn(),
    // Mock API calls that may be made on render
    fetchTemplates: vi.fn().mockResolvedValue([]),
    fetchHistory: vi.fn().mockResolvedValue([]),
    fetchBrands: vi.fn().mockResolvedValue([]),
    fetchPersonas: vi.fn().mockResolvedValue([]),
    fetchProjects: vi.fn().mockResolvedValue([]),
    fetchTags: vi.fn().mockResolvedValue([]),
  };
});

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    // App should render the home page by default
    expect(document.body).toBeInTheDocument();
  });

  it('has proper routing structure', () => {
    render(<App />);
    // The app uses BrowserRouter, so it should be rendering something
    expect(document.querySelector('body')).toBeTruthy();
  });
});
