const API_BASE = '/api';

const TOKEN_KEY = 'rp_access';
const REFRESH_KEY = 'rp_refresh';

const USERNAME_KEY = 'rp_username';
const USERID_KEY = 'rp_userid';

export function getTokens() {
  return {
    access: localStorage.getItem(TOKEN_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  };
}

export function getSavedUser() {
  const userName = localStorage.getItem(USERNAME_KEY);
  const userIdRaw = localStorage.getItem(USERID_KEY);
  if (!userName) return null;
  return { userName, userId: userIdRaw ? Number(userIdRaw) : null };
}

export function saveUser(userName: string, userId: number | null) {
  localStorage.setItem(USERNAME_KEY, userName);
  if (userId != null) localStorage.setItem(USERID_KEY, String(userId));
}

function clearUser() {
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(USERID_KEY);
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

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
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
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
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

  const data = await res.json();
  setTokens(data.access, data.refresh);

  const name = data.name || userName;
  const userId = data.user_id ?? null;
  saveUser(name, userId);
  return { userName: name, userId };
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
  clearUser();
}
