import { create } from 'zustand'
import { User } from '@/types'
import { apiClient } from '@/lib/api'

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  getMe: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiClient.login(email, password)
      apiClient.setToken(response.access_token)
      set({
        user: response.user,
        token: response.access_token,
        isLoading: false,
      })
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al iniciar sesión'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  logout: () => {
    apiClient.clearToken()
    set({ user: null, token: null })
  },

  getMe: async () => {
    try {
      const user = await apiClient.getMe()
      set({ user })
    } catch (error) {
      set({ user: null, token: null })
      throw error
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))
