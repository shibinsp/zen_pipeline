import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

// Helper to set a cookie (Docker-compatible with no domain restriction)
const setCookie = (name: string, value: string, days: number = 7) => {
  if (typeof document === 'undefined') return
  const expires = new Date()
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
  // Use Lax SameSite for better compatibility, no domain for Docker portability
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

// Helper to delete a cookie
const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`
}

// Helper to get a cookie value
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=')
    if (cookieName === name) {
      return decodeURIComponent(cookieValue)
    }
  }
  return null
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  sessionId: string | null
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  initializeFromStorage: () => void
}

// Generate a unique session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set: (state: Partial<AuthState>) => void, get: () => AuthState) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      sessionId: null,

      setUser: (user: User | null) =>
        set({
          user,
          isAuthenticated: !!user,
        }),

      setTokens: (accessToken: string, refreshToken: string) => {
        // Store in localStorage
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken)

        // Also set cookies for middleware access
        setCookie('access_token', accessToken, 1) // 1 day for access token
        setCookie('refresh_token', refreshToken, 7) // 7 days for refresh token

        // Generate session ID if not exists
        const currentSessionId = get().sessionId
        const sessionId = currentSessionId || generateSessionId()

        if (!currentSessionId) {
          localStorage.setItem('session_id', sessionId)
          setCookie('session_id', sessionId, 7)
        }

        set({
          accessToken,
          refreshToken,
          isAuthenticated: true,
          sessionId,
        })
      },

      logout: () => {
        // Clear localStorage
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('session_id')

        // Clear cookies
        deleteCookie('access_token')
        deleteCookie('refresh_token')
        deleteCookie('session_id')

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          sessionId: null,
        })
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      initializeFromStorage: () => {
        if (typeof window === 'undefined') return

        const accessToken = localStorage.getItem('access_token')
        const refreshToken = localStorage.getItem('refresh_token')
        const sessionId = localStorage.getItem('session_id')

        if (accessToken && refreshToken) {
          // Sync to cookies
          setCookie('access_token', accessToken, 1)
          setCookie('refresh_token', refreshToken, 7)
          if (sessionId) {
            setCookie('session_id', sessionId, 7)
          }

          set({
            accessToken,
            refreshToken,
            sessionId,
            isAuthenticated: true,
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state: AuthState) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionId: state.sessionId,
      }),
    }
  )
)
