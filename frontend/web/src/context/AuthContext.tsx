import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  getTokens,
  decodeJwtPayload,
} from '../api/client';

type User = { userName: string; userId: number | null };

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  login: (userName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { access } = getTokens();
    if (access) {
      try {
        const payload = decodeJwtPayload(access);
        setUser({ userName: payload.user_name as string, userId: (payload.user_id as number) ?? null });
      } catch {
        setUser(null);
      }
    }
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
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
