'use client'

import { create } from 'zustand'
import { authApi } from '@/lib/api'

interface AdminRole {
  id: number
  name: string
  displayName: string
  permissions?: string[]
}

interface Admin {
  id: number
  username: string
  email: string
  nickname: string
  avatarUrl: string | null
  role: AdminRole
  lastLoginAt?: string
  lastLoginIp?: string
}

interface AuthState {
  token: string | null
  admin: Admin | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setAdmin: (admin: Admin) => void
  checkAuth: () => Promise<void>
  initialize: () => void
}

const getInitialToken = (): string | null => {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem('admin_token')
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  admin: null,
  isLoading: false,
  
  login: async (username: string, password: string) => {
    set({ isLoading: true })
    try {
      const data = await authApi.login({ username, password })
      const { token, admin } = data
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('admin_token', token)
      }
      
      set({ token, admin, isLoading: false })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },
  
  logout: async () => {
    set({ isLoading: true })
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token')
      }
      set({ token: null, admin: null, isLoading: false })
    }
  },
  
  setAdmin: (admin: Admin) => {
    set({ admin })
  },
  
  checkAuth: async () => {
    const { token } = get()
    if (!token) {
      set({ admin: null })
      return
    }
    
    set({ isLoading: true })
    try {
      const admin = await authApi.getProfile()
      set({ admin, isLoading: false })
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token')
      }
      set({ token: null, admin: null, isLoading: false })
      throw error
    }
  },
  
  initialize: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin_token')
      if (token) {
        set({ token })
      }
    }
  },
}))
