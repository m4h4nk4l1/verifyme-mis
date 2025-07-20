'use client'

import React from 'react'
import { EmployeeNavigation } from '@/components/dashboard/EmployeeNavigation'
import { EnhancedFormDashboard } from '@/components/forms/EnhancedFormDashboard'

export default function EmployeeFormsPage() {
  return (
    <EmployeeNavigation>
      <div className="p-6">
        <EnhancedFormDashboard 
          title="My Forms"
          description="View and manage all your form entries with advanced search and filtering"
        />
      </div>
    </EmployeeNavigation>
  )
}
