import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { loginRequest, type SessionUser } from '@/api/auth';
import { setAuthBridge } from '@/api/client';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// SecureStore has no web support: fall back to localStorage so the app can be checked in a browser.
const store = {
  get: async (k: string) => (Platform.OS === 'web' ? localStorage.getItem(k) : SecureStore.getItemAsync(k)),
  set: async (k: string, v: string) =>
    Platform.OS === 'web' ? localStorage.setItem(k, v) : SecureStore.setItemAsync(k, v),
  del: async (k: string) => (Platform.OS === 'web' ? localStorage.removeItem(k) : SecureStore.deleteItemAsync(k)),
};

type Session = {
  token: string | null;
  user: SessionUser | null;
  loading: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
};

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await store.get(TOKEN_KEY);
        const u = await store.get(USER_KEY);
        if (t && u) {
          setToken(t);
          setUser(JSON.parse(u));
        }
      } catch {
        // unreadable store: start signed out
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signOut = useCallback(async () => {
    setToken(null);
    setUser(null);
    await Promise.all([store.del(TOKEN_KEY), store.del(USER_KEY)]).catch(() => {});
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await loginRequest(email, password); // throws for non-admin: nothing is stored
    await store.set(TOKEN_KEY, res.token);
    await store.set(USER_KEY, JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  }, []);

  // Set during render so child effects/queries never fire with a stale token.
  setAuthBridge(token, signOut);

  const value = useMemo(() => ({ token, user, loading, signIn, signOut }), [token, user, loading, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession must be used inside SessionProvider');
  return s;
}
