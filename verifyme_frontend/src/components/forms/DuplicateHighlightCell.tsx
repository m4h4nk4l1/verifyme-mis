'use client'

import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface DuplicateHighlightCellProps {
  value: string | boolean | null
  isDuplicate: boolean
  fieldType: string
}

export function DuplicateHighlightCell({ 
  value, 
  isDuplicate, 
  fieldType 
}: DuplicateHighlightCellProps) {
  const formatValue = (val: string | boolean | null, type: string) => {
    if (val === null || val === undefined) return 'N/A'
    
    switch (type) {
      case 'BOOLEAN':
        return val ? 'Yes' : 'No'
      case 'DATE':
        return new Date(val as string).toLocaleDateString()
      default:
        return String(val)
    }
  }

  const displayValue = formatValue(value, fieldType)

  if (isDuplicate) {
    return (
      <div className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3 text-orange-500" />
        <span className="text-sm font-medium text-orange-700">
          {displayValue}
        </span>
      </div>
    )
  }

  return (
    <span className="text-sm">
      {displayValue}
    </span>
  )
} 