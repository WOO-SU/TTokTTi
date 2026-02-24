import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  getTokens,
  getSavedUser,
} from '../api/client';

type User = { userName: string; userId: number | null };

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (userName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { access } = getTokens();
    if (access) {
      const saved = getSavedUser();
      if (saved) {
        setUser(saved);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (userName: string, password: string) => {
    const result = await apiLogin(userName, password);
    setUser({ userName: result.userName, userId: result.userId });
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
