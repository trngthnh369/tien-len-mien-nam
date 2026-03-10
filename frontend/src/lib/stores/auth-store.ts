import { create } from 'zustand';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface User {
  id: string;
  username: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  register: (username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
  refreshToken: typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('accessToken') : false,
  isLoading: false,
  error: null,

  register: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đăng ký thất bại');

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      set({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đăng nhập thất bại');

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      set({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  logout: () => {
    const { accessToken } = get();
    if (accessToken) {
      fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  refreshAccessToken: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return;

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Token refresh failed');

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      set({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
    } catch {
      get().logout();
    }
  },

  setError: (error: string | null) => set({ error }),
}));
