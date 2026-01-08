'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { auth } from '@/lib/api/endpoints'
import { Loader2 } from 'lucide-react'

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password']

// Helper to set cookie for middleware access
const syncTokenToCookie = (token: string | null) => {
  if (typeof document === 'undefined') return
  if (token) {
    const expires = new Date()
    expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000) // 1 day
    document.cookie = `access_token=${encodeURIComponent(token)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
  } else {
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax'
  }
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, setUser, logout, setLoading, initializeFromStorage } = useAuthStore()
  const [isValidating, setIsValidating] = useState(true)

  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))

  useEffect(() => {
    const validateSession = async () => {
      setIsValidating(true)

      // Initialize from storage on mount
      initializeFromStorage()

      // Check if we have tokens in localStorage
      const storedAccessToken = typeof window !== 'undefined'
        ? localStorage.getItem('access_token')
        : null

      if (!storedAccessToken) {
        // No token - clear auth state and redirect if on protected route
        syncTokenToCookie(null)
        if (!isPublicRoute) {
          logout()
          router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`)
        }
        setIsValidating(false)
        setLoading(false)
        return
      }

      // Sync token to cookie for middleware
      syncTokenToCookie(storedAccessToken)

      // If we have a token but no user data, fetch user info
      if (storedAccessToken && !user) {
        try {
          const response = await auth.me()
          setUser(response.data)
        } catch (error) {
          // Token is invalid or expired
          console.error('Session validation failed:', error)
          syncTokenToCookie(null)
          logout()
          if (!isPublicRoute) {
            router.push(`/login?redirect=${encodeURIComponent(pathname || '/')}`)
          }
        }
      }

      setIsValidating(false)
      setLoading(false)
    }

    validateSession()
  }, [pathname])

  // Redirect authenticated users away from public routes
  useEffect(() => {
    if (!isValidating && isAuthenticated && isPublicRoute && pathname !== '/') {
      router.push('/')
    }
  }, [isValidating, isAuthenticated, isPublicRoute, pathname, router])

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Validating session...</p>
        </div>
      </div>
    )
  }

  // For protected routes, ensure user is authenticated
  if (!isPublicRoute && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
