import { create } from 'zustand';
import type { UserRole } from '@/types/domain';

// TODO FE-01: thay login giả bằng auth thật (token persist bằng expo-secure-store, refresh, tài khoản bị khóa...).

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  shareLocation: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isHydrated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isHydrated: false,
  login: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null }),
  setHydrated: (state) => set({ isHydrated: state }),
}));

export const selectIsLoggedIn = (s: AuthState) => s.user !== null;
export const selectIsAdmin = (s: AuthState) => s.user?.role === 'admin';