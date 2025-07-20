'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  Building2, 
  AlertTriangle,
  X
} from 'lucide-react'
import { toast } from 'sonner'

// Simple Alert component since the UI library might not have it
const Alert = ({ variant, children }: { variant?: string, children: React.ReactNode }) => (
  <div className={`p-4 rounded-md border ${variant === 'destructive' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
    {children}
  </div>
)

const AlertDescription = ({ children }: { children: React.ReactNode }) => (
  <div className="text-sm">{children}</div>
)

export interface AdvancedFiltersProps {
  filters: FormEntryFilters
  onFiltersChange: (filters: FormEntryFilters) => void
  onClearFilters: () => void
  isLoading?: boolean
  schemaFields?: string[]
  warnings?: string[]
}

export interface FormEntryFilters {
  // Date filters
  dateRange?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  startDate?: string
  endDate?: string
  month?: number
  year?: number
  
  // Business filters
  bankNbfc?: string
  location?: 'Maharashtra' | 'Goa'
  productType?: string
  caseStatus?: 'Positive' | 'Negative' | 'Profile Decline' | 'Pending'
  isRepeatCase?: boolean
  isOutOfTat?: boolean
  
  // Personnel filters
  fieldVerifier?: string
  backOfficeExecutive?: string
  
  // General filters
  search?: string
  employee?: string
  status?: 'pending' | 'completed' | 'verified'
  
  // Schema validation
  schemaFields?: string[]
}

export function AdvancedFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  isLoading = false,
  schemaFields = [],
  warnings = []
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FormEntryFilters>(filters)
  const [showWarnings, setShowWarnings] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleFilterChange = (key: keyof FormEntryFilters, value: string | number | boolean | undefined) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    
    // Apply search filter immediately with debouncing for better UX
    if (key === 'search') {
      // Clear any existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      
      // Debounce the search to avoid too many API calls
      searchTimeoutRef.current = setTimeout(() => {
        onFiltersChange(newFilters)
      }, 500) // 500ms delay
    }
  }

  const handleApplyFilters = () => {
    // Check for schema field warnings
    const businessFields = [
      { filterKey: 'bankNbfc', schemaField: 'bank_nbfc_name' },
      { filterKey: 'location', schemaField: 'location' },
      { filterKey: 'productType', schemaField: 'product_type' },
      { filterKey: 'caseStatus', schemaField: 'case_status' },
      { filterKey: 'fieldVerifier', schemaField: 'field_verifier_name' },
      { filterKey: 'backOfficeExecutive', schemaField: 'back_office_executive_name' },
      { filterKey: 'isRepeatCase', schemaField: 'is_repeat_case' }
    ]
    
    const missingFields = businessFields.filter(field => {
      const hasValue = localFilters[field.filterKey as keyof FormEntryFilters]
      const existsInSchema = schemaFields.includes(field.schemaField)
      return hasValue && !existsInSchema
    })

    if (missingFields.length > 0) {
      setShowWarnings(true)
      const fieldNames = missingFields.map(f => {
        const displayName = f.filterKey.replace(/([A-Z])/g, ' $1').trim()
        return displayName.charAt(0).toUpperCase() + displayName.slice(1)
      }).join(', ')
      
      const warningMessage = `Warning: The following filter fields are not available in your organization's form schema: ${fieldNames}. These filters will be ignored.`
      toast.warning(warningMessage, {
        duration: 5000,
        description: 'Please check with your administrator to add these fields to your form schema.'
      })
      
      // Still apply filters but log the warning
      console.warn('Schema field validation failed:', missingFields)
    } else {
      setShowWarnings(false)
    }

    onFiltersChange(localFilters)
  }

  const handleClearFilters = () => {
    const clearedFilters: FormEntryFilters = {
      dateRange: undefined,
      startDate: undefined,
      endDate: undefined,
      month: undefined,
      year: undefined,
      bankNbfc: undefined,
      location: undefined,
      productType: undefined,
      caseStatus: undefined,
      isRepeatCase: undefined,
      isOutOfTat: undefined,
      fieldVerifier: undefined,
      backOfficeExecutive: undefined,
      search: undefined,
      employee: undefined,
      status: undefined
    }
    setLocalFilters(clearedFilters)
    onClearFilters()
  }

  const getMonthOptions = () => {
    return [
      { value: '', label: 'All Months' },
      { value: '1', label: 'January' },
      { value: '2', label: 'February' },
      { value: '3', label: 'March' },
      { value: '4', label: 'April' },
      { value: '5', label: 'May' },
      { value: '6', label: 'June' },
      { value: '7', label: 'July' },
      { value: '8', label: 'August' },
      { value: '9', label: 'September' },
      { value: '10', label: 'October' },
      { value: '11', label: 'November' },
      { value: '12', label: 'December' }
    ]
  }

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push({ value: i.toString(), label: i.toString() })
    }
    return [{ value: '', label: 'All Years' }, ...years]
  }

  const getDateRangeOptions = () => {
    return [
      { value: '', label: 'All Time' },
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'This Week' },
      { value: 'month', label: 'This Month' },
      { value: 'quarter', label: 'This Quarter' },
      { value: 'year', label: 'This Year' },
      { value: 'custom', label: 'Custom Range' }
    ]
  }

  const getStatusOptions = () => {
    return [
      { value: '', label: 'All Status' },
      { value: 'pending', label: 'Pending' },
      { value: 'completed', label: 'Completed' },
      { value: 'verified', label: 'Verified' }
    ]
  }

  const getCaseStatusOptions = () => {
    return [
      { value: '', label: 'All Case Status' },
      { value: 'Positive', label: 'Positive' },
      { value: 'Negative', label: 'Negative' },
      { value: 'Profile Decline', label: 'Profile Decline' },
      { value: 'Pending', label: 'Pending' }
    ]
  }

  const getLocationOptions = () => {
    return [
      { value: '', label: 'All Locations' },
      { value: 'Maharashtra', label: 'Maharashtra' },
      { value: 'Goa', label: 'Goa' }
    ]
  }

  const getTatOptions = () => {
    return [
      { value: '', label: 'All TAT Status' },
      { value: 'true', label: 'Out of TAT' },
      { value: 'false', label: 'Within TAT' }
    ]
  }

  const getRepeatCaseOptions = () => {
    return [
      { value: '', label: 'All Cases' },
      { value: 'true', label: 'Repeat Cases' },
      { value: 'false', label: 'New Cases' }
    ]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Advanced Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warnings */}
        {showWarnings && warnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Schema Field Warnings:</p>
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index} className="text-sm">{warning}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              id="search"
              placeholder="Search in all fields..."
              value={localFilters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Date Filters */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Date Filters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateRange">Date Range</Label>
              <select
                id="dateRange"
                value={localFilters.dateRange || ''}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {getDateRangeOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={localFilters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={localFilters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <select
                id="month"
                value={localFilters.month?.toString() || ''}
                onChange={(e) => handleFilterChange('month', e.target.value ? parseInt(e.target.value) : undefined)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {getMonthOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <select
                id="year"
                value={localFilters.year?.toString() || ''}
                onChange={(e) => handleFilterChange('year', e.target.value ? parseInt(e.target.value) : undefined)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {getYearOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Business Filters */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Business Filters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bankNbfc">Bank/NBFC Name</Label>
              <Input
                id="bankNbfc"
                placeholder="Enter bank or NBFC name"
                value={localFilters.bankNbfc || ''}
                onChange={(e) => handleFilterChange('bankNbfc', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <select
                id="location"
                value={localFilters.location || ''}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {getLocationOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productType">Product Type</Label>
              <Input
                id="productType"
                placeholder="e.g., Auto, Home, Personal"
                value={localFilters.productType || ''}
                onChange={(e) => handleFilterChange('productType', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caseStatus">Case Status</Label>
              <select
                id="caseStatus"
                value={localFilters.caseStatus || ''}
                onChange={(e) => handleFilterChange('caseStatus', e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {getCaseStatusOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="isRepeatCase">Repeat Cases</Label>
              <select
                id="isRepeatCase"
                value={localFilters.isRepeatCase?.toString() || ''}
                onChange={(e) => handleFilterChange('isRepeatCase', e.target.value === 'true')}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {getRepeatCaseOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="isOutOfTat">TAT Status</Label>
              <select
                id="isOutOfTat"
                value={localFilters.isOutOfTat?.toString() || ''}
                onChange={(e) => handleFilterChange('isOutOfTat', e.target.value === 'true')}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {getTatOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Personnel Filters */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Personnel Filters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fieldVerifier">Field Verifier Name</Label>
              <Input
                id="fieldVerifier"
                placeholder="Enter field verifier name"
                value={localFilters.fieldVerifier || ''}
                onChange={(e) => handleFilterChange('fieldVerifier', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="backOfficeExecutive">Back Office Executive Name</Label>
              <Input
                id="backOfficeExecutive"
                placeholder="Enter back office executive name"
                value={localFilters.backOfficeExecutive || ''}
                onChange={(e) => handleFilterChange('backOfficeExecutive', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <Input
                id="employee"
                placeholder="Search by employee name"
                value={localFilters.employee || ''}
                onChange={(e) => handleFilterChange('employee', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Entry Status</Label>
              <select
                id="status"
                value={localFilters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {getStatusOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4">
          <Button 
            onClick={handleApplyFilters}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Apply Filters
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleClearFilters}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear All
          </Button>
        </div>

        {/* Active Filters Display */}
        {Object.values(localFilters).some(value => value !== undefined && value !== '' && value !== null) && (
          <div className="pt-4">
            <h4 className="text-sm font-medium mb-2">Active Filters:</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(localFilters).map(([key, value]) => {
                if (value !== undefined && value !== '' && value !== null) {
                  return (
                    <Badge key={key} variant="secondary" className="flex items-center gap-1">
                      {key}: {String(value)}
                      <button
                        onClick={() => handleFilterChange(key as keyof FormEntryFilters, undefined)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )
                }
                return null
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 