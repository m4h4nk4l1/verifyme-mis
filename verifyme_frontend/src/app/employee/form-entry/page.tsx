'use client'

import React from 'react'
import { EmployeeLayout } from '@/components/dashboard/EmployeeLayout'
import { FormView } from '@/components/forms/FormView'

export default function EmployeeFormEntryPage() {
  return (
    <EmployeeLayout currentPage="New Form Entry">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Form Entry</h1>
          <p className="text-gray-600">Fill out the form below to create a new entry</p>
        </div>
        
        <FormView />
      </div>
    </EmployeeLayout>
  )
} 