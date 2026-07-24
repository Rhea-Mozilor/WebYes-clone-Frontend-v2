import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  setAuth: (user, token) => {
    localStorage.setItem('access_token', token);
    set({ user, token });
  },
  // Only resets in-memory auth state (synchronously disables any query gated on
  // `token`, e.g. me/billing-credits/websites/organisations). Callers that need
  // localStorage wiped too (logout) must do that themselves, after any other
  // store's persist middleware (e.g. siteStore) has had a chance to write its
  // own reset state — otherwise that write would silently repopulate storage
  // right after this clears it.
  clearAuth: () => {
    set({ user: null, token: null });
  },
}));
