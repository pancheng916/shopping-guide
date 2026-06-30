'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoggedIn: false,
      login: (token, user) =>
        set({
          token,
          user,
          isLoggedIn: true,
        }),
      logout: () =>
        set({
          token: null,
          user: null,
          isLoggedIn: false,
        }),
      setUser: (user) =>
        set({
          user,
        }),
    }),
    {
      name: 'shopping-guide-auth',
    }
  )
);
