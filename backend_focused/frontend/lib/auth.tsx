'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, onSessionExpired, tokens } from './api-client';

export interface User {
  id: number;
  username: string;
}
type Session =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: User };
interface AuthContextValue {
  session: Session;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const anonymous: Session = { status: 'anonymous', user: null };

async function fetchUser() {
  return (await apiClient.get<User>('auth/me/')).data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session>({ status: 'loading', user: null });

  useEffect(() => {
    // Restore the session after a reload: the first request refreshes the access token.
    const restore = tokens.hasSession() ? fetchUser() : Promise.reject(new Error('No session'));
    restore
      .then((user) => setSession({ status: 'authenticated', user }))
      .catch(() => setSession(anonymous));
  }, []);

  useEffect(
    () =>
      onSessionExpired(() => {
        queryClient.clear();
        setSession(anonymous);
      }),
    [queryClient],
  );

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await apiClient.post<{ access: string; refresh: string }>('auth/token/', {
      username,
      password,
    });
    tokens.save(data.access, data.refresh);
    setSession({ status: 'authenticated', user: await fetchUser() });
  }, []);

  const logout = useCallback(async () => {
    const refresh = tokens.refreshToken();
    tokens.clear();
    queryClient.clear();
    setSession(anonymous);
    // Best effort: the local session is already gone even if revocation fails.
    if (refresh) await apiClient.post('auth/logout/', { refresh }).catch(() => undefined);
  }, [queryClient]);

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

/** Only same-origin paths, so a crafted ?next= cannot redirect off-site. */
export function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/vehicles';
}
