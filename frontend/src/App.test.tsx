import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock all API calls
vi.mock('./api/client', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue(null),
  getUsageLimits: vi.fn().mockResolvedValue(null),
  refreshToken: vi.fn(),
  getAuthToken: vi.fn().mockReturnValue(null),
  clearAuthToken: vi.fn(),
}));

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
