import { create } from 'zustand'
import { api } from '../lib/api'

interface User {
  id: string
  phone: string
  role: 'vendor' | 'rider'
  name?: string
  business_name?: string
}

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
  requestOtp: (phone: string, role: string) => Promise<string>
  verifyOtp: (phone: string, code: string, role: string, referralCode?: string) => Promise<void>
  loadUser: () => Promise<void>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('delivara_token'),
  user: JSON.parse(localStorage.getItem('delivara_user') || 'null'),
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  requestOtp: async (phone, role) => {
    set({ error: null })
    const res = await api<{ dev_code: string }>('/api/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, role }),
    })
    return res.dev_code
  },

  verifyOtp: async (phone, code, role, referralCode) => {
    set({ loading: true, error: null })
    try {
      const res = await api<{ token: string; user: User }>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, code, role, referral_code: referralCode }),
      })
      localStorage.setItem('delivara_token', res.token)
      localStorage.setItem('delivara_user', JSON.stringify(res.user))
      // Set state synchronously before caller navigates
      set({ token: res.token, user: res.user, loading: false })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Verification failed'
      set({ loading: false, error: message })
      throw err // re-throw so LoginPage can react if needed
    }
  },

  loadUser: async () => {
    try {
      const user = await api<User>('/api/me')
      localStorage.setItem('delivara_user', JSON.stringify(user))
      set({ user })
    } catch {
      set({ token: null, user: null })
      localStorage.removeItem('delivara_token')
      localStorage.removeItem('delivara_user')
    }
  },

  logout: () => {
    localStorage.removeItem('delivara_token')
    localStorage.removeItem('delivara_user')
    set({ token: null, user: null, error: null })
  },
}))
