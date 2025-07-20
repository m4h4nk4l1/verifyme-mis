'use client'

import React from 'react'
import { EmployeeLayout } from '@/components/dashboard/EmployeeLayout'
import EmployeeDashboard from '@/components/forms/EmployeeDashboard'

export default function EmployeeDashboardPage() {
  return (
    <EmployeeLayout currentPage="Dashboard">
      <EmployeeDashboard />
    </EmployeeLayout>
  )
} 