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
      } else {
        // 토큰은 있지만 유저 정보가 localStorage에 없는 경우 (이전 로그인)
        try {
          const payload = JSON.parse(atob(access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          setUser({ userName: payload.user_name ?? '', userId: payload.user_id ?? null });
        } catch {
          setUser({ userName: '', userId: null });
        }
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
