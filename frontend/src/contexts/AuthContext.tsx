import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  UsageLimits,
  TokenResponse,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
  getUsageLimits,
  refreshToken,
  getAuthToken,
  clearAuthToken,
} from '../api/client';

interface AuthContextType {
  user: User | null;
  usage: UsageLimits | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshUsage: () => Promise<void>;
  checkFeatureAccess: (feature: string) => boolean;
  canGenerate: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<UsageLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch {
      setUser(null);
      clearAuthToken();
    }
  }, []);

  const refreshUsage = useCallback(async () => {
    try {
      const usageData = await getUsageLimits();
      setUsage(usageData);
    } catch {
      setUsage(null);
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          await refreshUser();
          await refreshUsage();
        } catch {
          // Try to refresh the token
          try {
            await refreshToken();
            await refreshUser();
            await refreshUsage();
          } catch {
            clearAuthToken();
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [refreshUser, refreshUsage]);

  const login = async (email: string, password: string) => {
    const response: TokenResponse = await apiLogin({ email, password });
    setUser(response.user);
    await refreshUsage();
  };

  const register = async (email: string, username: string, password: string) => {
    const response: TokenResponse = await apiRegister({ email, username, password });
    setUser(response.user);
    await refreshUsage();
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setUsage(null);
  };

  const checkFeatureAccess = (feature: string): boolean => {
    if (!usage) return false;
    return usage.features.includes(feature) && !usage.locked_features.includes(feature);
  };

  const canGenerate = (): boolean => {
    if (!usage) return false;
    if (usage.generation_limit === -1) return true; // Unlimited
    return usage.generations_remaining > 0;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        usage,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        refreshUsage,
        checkFeatureAccess,
        canGenerate,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
