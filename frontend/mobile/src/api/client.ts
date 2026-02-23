import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// const API_BASE_URL = 'http://10.0.2.2:8000/api'; // Android Emulator
const API_BASE_URL = 'http://localhost:8000/api';   // Real Device (with adb reverse) or Localhost

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 요청 인터셉터: 매 요청마다 access 토큰 헤더에 추가
client.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 403 시 refresh 토큰으로 재발급 후 재시도
client.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    const status = error.response?.status;
    if ((status === 401 || status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE_URL}/user/refresh/`, {
          refresh: refreshToken,
        });

        const { access, refresh } = res.data;
        await AsyncStorage.setItem('access_token', access);
        if (refresh) {
          await AsyncStorage.setItem('refresh_token', refresh);
        }

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return client(originalRequest);
      } catch {
        // refresh 실패 시 토큰 삭제
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default client;
