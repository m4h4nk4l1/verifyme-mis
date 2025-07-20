'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdvancedFilters } from './AdvancedFilters'
import { 
  Search, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileText
} from 'lucide-react'
import { FormEntry, FormEntryFilters } from '@/types/api'
import { apiClient } from '@/lib/api'

interface FormEntryListProps {
  title?: string
  description?: string
  showFilters?: boolean
  showActions?: boolean
  onEntrySelect?: (entry: FormEntry) => void
  onEntryEdit?: (entry: FormEntry) => void
  onEntryDelete?: (entry: FormEntry) => void
  onEntryComplete?: (entry: FormEntry) => void
  onEntryVerify?: (entry: FormEntry) => void
}

export function FormEntryList({
  title = "Form Entries",
  description = "View and manage form submissions",
  showFilters = true,
  showActions = true,
  onEntrySelect,
  onEntryEdit,
  onEntryDelete,
  onEntryComplete,
  onEntryVerify
}: FormEntryListProps) {
  const [entries, setEntries] = useState<FormEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FormEntryFilters>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.getFormEntries({
        ...filters,
        search: searchTerm || undefined,
      })
      
      setEntries(response.results)
      setTotalCount(response.count)
    } catch (err) {
      console.error('Error fetching entries:', err)
      setError('Failed to load form entries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [filters, searchTerm, currentPage])

  const handleFiltersChange = (newFilters: FormEntryFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setFilters({})
    setSearchTerm('')
    setCurrentPage(1)
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const blob = await apiClient.exportData({
        format,
        filters: {
          ...filters,
          search: searchTerm || undefined,
        }
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `form-entries-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export data')
    }
  }

  const getStatusIcon = (entry: FormEntry) => {
    if (entry.is_verified) {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    } else if (entry.is_completed) {
      return <Clock className="h-4 w-4 text-yellow-600" />
    } else {
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusText = (entry: FormEntry) => {
    if (entry.is_verified) return 'Verified'
    if (entry.is_completed) return 'Completed'
    return 'Pending'
  }

  const getStatusColor = (entry: FormEntry) => {
    if (entry.is_verified) return 'text-green-600 bg-green-50'
    if (entry.is_completed) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTatStatus = (entry: FormEntry) => {
    if (entry.is_out_of_tat) {
      return <span className="text-red-600 text-xs font-medium">Out of TAT</span>
    }
    return <span className="text-green-600 text-xs font-medium">Within TAT</span>
  }

  if (loading && entries.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading entries...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <XCircle className="h-8 w-8 text-red-600" />
          <span className="ml-2 text-red-600">{error}</span>
          <Button onClick={fetchEntries} variant="outline" className="ml-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleExport('excel')}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button
            onClick={() => handleExport('pdf')}
            variant="outline"
            size="sm"
          >
            <FileText className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <AdvancedFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          isLoading={loading}
        />
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search entries..."
              className="pl-10"
            />
          </div>
        </div>
        <Button
          onClick={fetchEntries}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Showing {entries.length} of {totalCount} entries</span>
        {Object.keys(filters).length > 0 && (
          <span className="text-blue-600">
            {Object.keys(filters).length} filter(s) applied
          </span>
        )}
      </div>

      {/* Entries Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank/NBFC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Case Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    TAT Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  {showActions && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(entry)}
                        <span className={`ml-2 text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(entry)}`}>
                          {getStatusText(entry)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {entry.form_data.customer_name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {entry.form_data.pan_card || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.form_data.product_type || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.form_data.location || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.form_data.bank_nbfc_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        entry.form_data.case_status === 'Positive' ? 'bg-green-100 text-green-800' :
                        entry.form_data.case_status === 'Negative' ? 'bg-red-100 text-red-800' :
                        entry.form_data.case_status === 'Profile Decline' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {entry.form_data.case_status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTatStatus(entry)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(entry.created_at)}
                    </td>
                    {showActions && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {onEntrySelect && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEntrySelect(entry)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {onEntryEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEntryEdit(entry)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {onEntryComplete && !entry.is_completed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEntryComplete(entry)}
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {onEntryVerify && entry.is_completed && !entry.is_verified && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEntryVerify(entry)}
                            >
                              <CheckCircle className="h-4 w-4 text-blue-600" />
                            </Button>
                          )}
                          {onEntryDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEntryDelete(entry)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {entries.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No entries found</h3>
            <p className="text-gray-600 text-center">
              {Object.keys(filters).length > 0 
                ? 'Try adjusting your filters to see more results.'
                : 'No form entries have been submitted yet.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 