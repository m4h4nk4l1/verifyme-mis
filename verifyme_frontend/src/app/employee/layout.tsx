'use client'

import React from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute allowedRoles={['EMPLOYEE']}>
      {children}
    </ProtectedRoute>
  )
} 