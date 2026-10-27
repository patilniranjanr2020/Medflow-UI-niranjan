import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { tokenStore, UNAUTHORIZED_EVENT } from '../api/client';
import { authApi } from '../api/services';
import type { UserAccount } from '../api/types';

interface AuthContextValue {
  user: UserAccount | null;
  permissions: string[];
  isAuthenticated: boolean;
  /** True until the stored session has been checked against the API on first load. */
  isRestoring: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    hospitalName?: string;
  }) => Promise<void>;
  logout: () => void;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PERMISSIONS_KEY = 'medflow.permissions';

/**
 * Holds the signed-in session. The token lives in localStorage so a refresh keeps you
 * signed in; it is validated against `/auth/me` on start-up, and any 401 from anywhere
 * in the app clears the session through the {@link UNAUTHORIZED_EVENT}.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(() => tokenStore.getUser<UserAccount>());
  const [permissions, setPermissions] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem(PERMISSIONS_KEY) ?? '[]'),
  );
  const [isRestoring, setIsRestoring] = useState(() => Boolean(tokenStore.get()));

  const logout = useCallback(() => {
    tokenStore.clear();
    localStorage.removeItem(PERMISSIONS_KEY);
    setUser(null);
    setPermissions([]);
  }, []);

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  useEffect(() => {
    if (!tokenStore.get()) {
      setIsRestoring(false);
      return;
    }
    authApi
      .me()
      .then((profile) => {
        setUser(profile);
        tokenStore.setUser(profile);
      })
      .catch(() => logout())
      .finally(() => setIsRestoring(false));
  }, [logout]);

  const adopt = useCallback((session: Awaited<ReturnType<typeof authApi.login>>) => {
    tokenStore.set(session.accessToken);
    tokenStore.setUser(session.user);
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(session.permissions ?? []));
    setUser(session.user);
    setPermissions(session.permissions ?? []);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      permissions,
      isAuthenticated: Boolean(user),
      isRestoring,
      login: async (email, password) => adopt(await authApi.login(email, password)),
      register: async (payload) => adopt(await authApi.register(payload)),
      logout,
      can: (permission) => permissions.includes(permission) || user?.roleCode === 'ADMIN',
    }),
    [user, permissions, isRestoring, adopt, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
