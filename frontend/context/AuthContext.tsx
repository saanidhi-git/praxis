'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, type Principal } from '../services/api';

interface AuthValue {
  user: Principal | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string, email: string, password: string, role: 'student' | 'teacher',
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

const TOKEN_KEY = 'praxis.token';
const USER_KEY = 'praxis.user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Principal | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (raw && token) setUser(JSON.parse(raw) as Principal);
    } catch {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
    setReady(true);
  }, []);

  const persist = (res: { token: string; user: Principal }) => {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    setUser(res.user);
  };

  const login = useCallback(async (email: string, password: string) => {
    persist(await api.login(email, password));
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, role: 'student' | 'teacher') => {
      persist(await api.register(name, email, password, role));
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout }),
    [user, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
