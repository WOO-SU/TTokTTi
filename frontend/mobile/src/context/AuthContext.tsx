import React, {createContext, useContext, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';

type AuthContextType = {
  isLoggedIn: boolean;
  loading: boolean;
  login: (userName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // 앱 시작 시 저장된 토큰 확인
  useEffect(() => {
    AsyncStorage.getItem('access_token').then(token => {
      setIsLoggedIn(!!token);
      setLoading(false);
    });
  }, []);

  const login = async (userName: string, password: string) => {
    const res = await client.post('/user/login/', {
      user_name: userName,
      password,
    });

    const {access, refresh} = res.data;
    await AsyncStorage.setItem('access_token', access);
    await AsyncStorage.setItem('refresh_token', refresh);
    setIsLoggedIn(true);
  };

  const logout = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        await client.post('/user/logout/', {refresh: refreshToken});
      }
    } catch {
      // 로그아웃 API 실패해도 로컬 토큰은 삭제
    } finally {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      setIsLoggedIn(false);
    }
  };

  return (
    <AuthContext.Provider value={{isLoggedIn, loading, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
