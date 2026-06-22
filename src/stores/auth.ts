import { create } from 'zustand'
import { api } from '../lib/api'

export interface Identity {
  kind: 'phone' | 'email'
  value: string
}
interface User {
  id: string
  phone?: string
  email?: string
  role: 'vendor' | 'rider'        // the experience the user is CURRENTLY in
  roles?: ('vendor' | 'rider')[]  // every experience the user is allowed to use
  name?: string
  business_name?: string
  identities?: Identity[]
}

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
  requestOtp: (contact: string, role: string, method?: 'email' | 'phone') => Promise<string>
  verifyOtp: (contact: string, code: string, role: string, referralCode?: string, method?: 'email' | 'phone') => Promise<void>
  loadUser: () => Promise<void>
  switchRole: (role: 'vendor' | 'rider') => Promise<void>
  applyForRider: (fullName: string, phone: string, note?: string) => Promise<void>
  getRiderApplication: () => Promise<RiderApplication | null>
  logout: () => void
  clearError: () => void
}

export interface RiderApplication {
  id: string
  full_name: string
  phone: string
  status: 'pending' | 'approved' | 'rejected'
  reject_reason?: string
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('delivara_token'),
  user: JSON.parse(localStorage.getItem('delivara_user') || 'null'),
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  requestOtp: async (contact, role, method = 'phone') => {
    set({ error: null })
    const body = method === 'email' 
      ? { email: contact, role }
      : { phone: contact, role }
    const res = await api<{ dev_code: string }>('/api/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    return res.dev_code
  },

  verifyOtp: async (contact, code, role, referralCode, method = 'phone') => {
    set({ loading: true, error: null })
    try {
      const body = method === 'email'
        ? { email: contact, code, role, referral_code: referralCode }
        : { phone: contact, code, role, referral_code: referralCode }
      const res = await api<{ token: string; user: User }>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify(body),
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

  switchRole: async (role) => {
    // Flip the active experience (sender <-> rider). The backend grants the role
    // if missing and returns a fresh token reflecting the new active role.
    const res = await api<{ token: string; user: User }>('/api/me/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    })
    localStorage.setItem('delivara_token', res.token)
    localStorage.setItem('delivara_user', JSON.stringify(res.user))
    set({ token: res.token, user: res.user })
  },

  applyForRider: async (fullName, phone, note) => {
    await api('/api/me/rider-application', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, phone, note }),
    })
  },

  getRiderApplication: async () => {
    const res = await api<{ application: RiderApplication | null }>('/api/me/rider-application')
    return res.application
  },

  logout: () => {
    localStorage.removeItem('delivara_token')
    localStorage.removeItem('delivara_user')
    set({ token: null, user: null, error: null })
  },
}))
