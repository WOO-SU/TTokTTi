import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

type AuthContextType = {
  isLoggedIn: boolean;
  loading: boolean;
  userId: number | null;
  userName: string | null;
  login: (userName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  loading: true,
  userId: null,
  userName: null,
  login: async () => { },
  logout: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // 앱 시작 시 저장된 토큰 확인
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('access_token'),
      AsyncStorage.getItem('user_id'),
      AsyncStorage.getItem('user_name'),
    ]).then(([token, idStr, name]) => {
      setIsLoggedIn(!!token);
      setUserId(idStr ? parseInt(idStr, 10) : null);
      setUserName(name);
      setLoading(false);
    });
  }, []);

  const login = async (userName: string, password: string) => {
    const res = await client.post('/user/login/', {
      username: userName,
      password,
    });

    const { access, refresh, user_id, name } = res.data;
    await AsyncStorage.setItem('access_token', access);
    await AsyncStorage.setItem('refresh_token', refresh);
    await AsyncStorage.setItem('user_id', String(user_id));
    await AsyncStorage.setItem('user_name', name);
    setUserId(user_id);
    setUserName(name);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        await client.post('/user/logout/', { refresh: refreshToken });
      }
    } catch {
      // 로그아웃 API 실패해도 로컬 토큰은 삭제
    } finally {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_id', 'user_name']);
      setIsLoggedIn(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, loading, userId, userName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
