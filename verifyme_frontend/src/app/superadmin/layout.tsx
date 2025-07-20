'use client'

import React from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
      {children}
    </ProtectedRoute>
  )
} 