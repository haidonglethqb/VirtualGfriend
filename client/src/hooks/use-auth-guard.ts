'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'

/**
 * Auth guard hook - redirects to login if not authenticated.
 * Replaces the duplicate useEffect + redirect pattern across all pages.
 */
export function useAuthGuard() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuthStore()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  return { isAuthenticated, isLoading, user }
}
