import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, setToken } from './api';

export type User = { id: string; email: string; role: 'admin' | 'terapeuta' | 'paciente'; name: string; phone?: string; avatar?: string };
type AuthValue = {
  user: User | null;
  patientId: string | null;
  therapistId: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; password: string; phone?: string; university?: string; career?: string }) => Promise<User>;
  loginWithGoogle: (credential: string) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<AuthValue>(null as any);
const USER_KEY = 'psicampus.user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
  });
  const [patientId, setPatientId] = useState<string | null>(null);
  const [therapistId, setTherapistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!getToken());

  const persist = useCallback((u: User | null, p?: string | null, t?: string | null) => {
    setUser(u);
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u)); else localStorage.removeItem(USER_KEY);
    if (p !== undefined) setPatientId(p);
    if (t !== undefined) setTherapistId(t);
  }, []);

  const logout = useCallback(() => {
    setToken('');
    persist(null, null, null);
    if (!location.hash.startsWith('#/login')) location.hash = '/login';
  }, [persist]);

  const refresh = useCallback(async () => {
    if (!getToken()) { setLoading(false); return; }
    try {
      const me = await api('/auth/me');
      persist(me.user, me.patientId ?? null, me.therapistId ?? null);
    } catch {
      /* token inválido */
    } finally {
      setLoading(false);
    }
  }, [persist]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('psicampus:unauthorized', onUnauthorized);
    return () => window.removeEventListener('psicampus:unauthorized', onUnauthorized);
  }, [logout]);

  const login = async (email: string, password: string) => {
    const res = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(res.token);
    persist(res.user, res.patientId ?? null, res.therapistId ?? null);
    return res.user as User;
  };

  const register = async (data: { name: string; email: string; password: string; phone?: string; university?: string; career?: string }) => {
    const res = await api('/auth/register', { method: 'POST', body: data });
    setToken(res.token);
    persist(res.user, res.patientId ?? null, res.therapistId ?? null);
    return res.user as User;
  };

  const loginWithGoogle = async (credential: string) => {
    const res = await api('/auth/google', { method: 'POST', body: { idToken: credential } });
    setToken(res.token);
    persist(res.user, res.patientId ?? null, res.therapistId ?? null);
    return res.user as User;
  };

  const value = useMemo(() => ({ user, patientId, therapistId, loading, login, register, loginWithGoogle, logout, refresh }), [user, patientId, therapistId, loading, login, register, loginWithGoogle, logout, refresh]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

export function homeFor(role?: string) {
  if (role === 'admin') return '/admin';
  if (role === 'terapeuta') return '/terapeuta';
  if (role === 'paciente') return '/portal';
  return '/';
}
