import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  isAdmin: () => boolean;
  isStage: (stage: number) => boolean;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  })(),
  token: localStorage.getItem('token'),

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  isAdmin: () => get().user?.role === 'admin',

  isStage: (stage: number) => {
    const user = get().user;
    return user?.role === 'admin' || user?.stage_assigned === stage;
  },
}));

export default useAuthStore;
