const API_BASE = '/api';

const TOKEN_KEY = 'rp_access';
const REFRESH_KEY = 'rp_refresh';

export function getTokens() {
  return {
    access: localStorage.getItem(TOKEN_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  };
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function decodeJwtPayload(token: string): Record<string, unknown> {
  const base64 = token.split('.')[1];
  const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
  return JSON.parse(json);
}

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = getTokens();
  if (!refresh) return null;

  const res = await fetch(`${API_BASE}/user/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const data = await res.json();
  setTokens(data.access, data.refresh ?? refresh);
  return data.access;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const { access } = getTokens();
  const headers = new Headers(options.headers);
  if (access) {
    headers.set('Authorization', `Bearer ${access}`);
  }
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && access) {
    const newAccess = await refreshAccessToken();
    if (newAccess) {
      headers.set('Authorization', `Bearer ${newAccess}`);
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  return res;
}

export async function login(
  userName: string,
  password: string,
): Promise<{ userName: string; userId: number | null }> {
  const res = await fetch(`${API_BASE}/user/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: userName, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? '로그인에 실패했습니다.');
  }

  const { access, refresh } = await res.json();
  setTokens(access, refresh);

  const payload = decodeJwtPayload(access);
  return { userName: (payload.user_name ?? userName) as string, userId: (payload.user_id as number) ?? null };
}

export async function logout(): Promise<void> {
  const { refresh } = getTokens();
  if (refresh) {
    await apiFetch('/user/logout/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    }).catch(() => {});
  }
  clearTokens();
}
