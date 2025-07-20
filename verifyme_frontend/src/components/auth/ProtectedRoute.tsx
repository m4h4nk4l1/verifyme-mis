'use client'

import React, { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE')[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Not authenticated, redirect to login
        router.push('/')
        return
      }

      // Check role-based access
      if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // User doesn't have required role, redirect based on their role
        const targetPath = (() => {
          switch (user.role) {
            case 'SUPER_ADMIN':
              return '/superadmin/dashboard'
            case 'ADMIN':
              return '/admin/dashboard'
            case 'EMPLOYEE':
              return '/employee/dashboard'
            default:
              return '/'
          }
        })()

        // Only redirect if not already on the target path
        if (pathname !== targetPath) {
          router.push(targetPath)
        }
        return
      }
    }
  }, [isLoading, isAuthenticated, user, router, allowedRoles, pathname])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return null // Will redirect to appropriate dashboard
  }

  return <>{children}</>
} 