import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api';
const REFRESH_KEY = 'fleet.refreshToken';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15_000,
});

// The access token lives only in memory; the refresh token survives reloads.
let accessToken: string | null = null;
let refreshing: Promise<string> | null = null;
const expiryListeners = new Set<() => void>();

export const tokens = {
  hasSession: () => typeof window !== 'undefined' && !!localStorage.getItem(REFRESH_KEY),
  refreshToken: () => localStorage.getItem(REFRESH_KEY),
  save(access: string, refresh: string) {
    accessToken = access;
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    accessToken = null;
    localStorage.removeItem(REFRESH_KEY);
  },
};

export function onSessionExpired(listener: () => void) {
  expiryListeners.add(listener);
  return () => {
    expiryListeners.delete(listener);
  };
}

async function refreshAccessToken(): Promise<string> {
  const refresh = tokens.refreshToken();
  if (!refresh) throw new Error('No refresh token');
  const { data } = await axios.post<{ access: string; refresh: string }>(
    `${apiBaseUrl}/auth/token/refresh/`,
    { refresh },
    { timeout: 15_000 },
  );
  tokens.save(data.access, data.refresh);
  return data.access;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as
    | (InternalAxiosRequestConfig & { _retried?: boolean })
    | undefined;
  const isAuthCall = original?.url?.startsWith('auth/token');
  if (error.response?.status !== 401 || !original || original._retried || isAuthCall) {
    throw error;
  }
  original._retried = true;
  try {
    // Parallel 401s share one refresh; a rotated refresh token can only be used once.
    refreshing ??= refreshAccessToken().finally(() => {
      refreshing = null;
    });
    const access = await refreshing;
    original.headers.Authorization = `Bearer ${access}`;
    return apiClient(original);
  } catch {
    tokens.clear();
    expiryListeners.forEach((listener) => listener());
    throw error;
  }
});
