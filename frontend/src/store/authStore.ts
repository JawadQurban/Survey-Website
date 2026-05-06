import { create } from 'zustand'
import type { AdminUser } from '@/types/admin'
import { hasPermission } from '@/types/admin'

interface AuthState {
  admin: AdminUser | null
  setAdmin: (user: AdminUser | null) => void
  isAuthenticated: boolean
  can: (permission: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  admin: null,
  isAuthenticated: false,
  setAdmin: (user) => set({ admin: user, isAuthenticated: user !== null }),
  can: (permission: string) => hasPermission(get().admin, permission),
}))
