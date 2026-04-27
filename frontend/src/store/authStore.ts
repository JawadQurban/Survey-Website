import { create } from 'zustand'
import type { AdminUser } from '@/types/admin'

interface AuthState {
  admin: AdminUser | null
  setAdmin: (user: AdminUser | null) => void
  isAuthenticated: boolean
}

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  isAuthenticated: false,
  setAdmin: (user) => set({ admin: user, isAuthenticated: user !== null }),
}))
