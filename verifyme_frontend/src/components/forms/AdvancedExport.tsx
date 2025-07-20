'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectItem } from '@/components/ui/select'
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileArchive
} from 'lucide-react'
import { FormEntryFilters } from '@/types/api'
import { apiClient } from '@/lib/api'

interface AdvancedExportProps {
  filters: FormEntryFilters
  onExportComplete?: () => void
  onCancel?: () => void
}

interface ExportOptions {
  format: 'excel' | 'pdf' | 'csv'
  includeFiles: boolean
  includeAttachments: boolean
  includeMetadata: boolean
  includeAnalytics: boolean
  dateRange: 'all' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom'
  customStartDate?: string
  customEndDate?: string
  groupBy?: string
  sortBy?: string
  sortOrder: 'asc' | 'desc'
  fileName: string
}

export function AdvancedExport({ filters, onExportComplete, onCancel }: AdvancedExportProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    includeFiles: true,
    includeAttachments: true,
    includeMetadata: true,
    includeAnalytics: false,
    dateRange: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc',
    fileName: `form-entries-${new Date().toISOString().split('T')[0]}`
  })

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleExport = async () => {
    try {
      setLoading(true)
      setProgress(0)

      // Prepare export payload
      const exportPayload = {
        format: exportOptions.format,
        filters: {
          ...filters,
          date_range: exportOptions.dateRange,
          custom_start_date: exportOptions.customStartDate,
          custom_end_date: exportOptions.customEndDate,
        },
        options: {
          include_files: exportOptions.includeFiles,
          include_attachments: exportOptions.includeAttachments,
          include_metadata: exportOptions.includeMetadata,
          include_analytics: exportOptions.includeAnalytics,
          group_by: exportOptions.groupBy,
          sort_by: exportOptions.sortBy,
          sort_order: exportOptions.sortOrder,
        },
        file_name: exportOptions.fileName
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Call export API
      const blob = await apiClient.exportData(exportPayload)
      
      clearInterval(progressInterval)
      setProgress(100)

      // Download the file
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exportOptions.fileName}.${exportOptions.format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      onExportComplete?.()

    } catch (err) {
      console.error('Export error:', err)
      alert('Failed to export data. Please try again.')
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  const updateExportOptions = (updates: Partial<ExportOptions>) => {
    setExportOptions(prev => ({ ...prev, ...updates }))
  }

  const getFormatDescription = () => {
    switch (exportOptions.format) {
      case 'excel':
        return 'Excel file with multiple sheets, formulas, and file references'
      case 'pdf':
        return 'PDF report with embedded attachments and analytics'
      case 'csv':
        return 'Simple CSV format for data analysis'
      default:
        return ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Advanced Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Export Format */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <div className="grid grid-cols-3 gap-3">
              <div
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  exportOptions.format === 'excel' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => updateExportOptions({ format: 'excel' })}
              >
                <FileSpreadsheet className="h-6 w-6 text-green-600 mb-2" />
                <div className="text-sm font-medium">Excel</div>
                <div className="text-xs text-gray-600">Advanced formatting</div>
              </div>
              <div
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  exportOptions.format === 'pdf' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => updateExportOptions({ format: 'pdf' })}
              >
                <FileText className="h-6 w-6 text-red-600 mb-2" />
                <div className="text-sm font-medium">PDF</div>
                <div className="text-xs text-gray-600">With attachments</div>
              </div>
              <div
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  exportOptions.format === 'csv' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => updateExportOptions({ format: 'csv' })}
              >
                <FileArchive className="h-6 w-6 text-gray-600 mb-2" />
                <div className="text-sm font-medium">CSV</div>
                <div className="text-xs text-gray-600">Simple data</div>
              </div>
            </div>
            <p className="text-sm text-gray-600">{getFormatDescription()}</p>
          </div>

          {/* File Name */}
          <div className="space-y-2">
            <Label>File Name</Label>
            <Input
              value={exportOptions.fileName}
              onChange={(e) => updateExportOptions({ fileName: e.target.value })}
              placeholder="Enter file name"
            />
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label>Date Range</Label>
            <Select
              value={exportOptions.dateRange}
              onChange={(e) => updateExportOptions({ dateRange: e.target.value as 'all' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom' })}
            >
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="last_90_days">Last 90 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </Select>
            
            {exportOptions.dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={exportOptions.customStartDate}
                    onChange={(e) => updateExportOptions({ customStartDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={exportOptions.customEndDate}
                    onChange={(e) => updateExportOptions({ customEndDate: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label>Export Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeFiles"
                  checked={exportOptions.includeFiles}
                  onCheckedChange={(checked) => updateExportOptions({ includeFiles: checked as boolean })}
                />
                <Label htmlFor="includeFiles">Include file references</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAttachments"
                  checked={exportOptions.includeAttachments}
                  onCheckedChange={(checked) => updateExportOptions({ includeAttachments: checked as boolean })}
                />
                <Label htmlFor="includeAttachments">Include attachments</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeMetadata"
                  checked={exportOptions.includeMetadata}
                  onCheckedChange={(checked) => updateExportOptions({ includeMetadata: checked as boolean })}
                />
                <Label htmlFor="includeMetadata">Include metadata</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAnalytics"
                  checked={exportOptions.includeAnalytics}
                  onCheckedChange={(checked) => updateExportOptions({ includeAnalytics: checked as boolean })}
                />
                <Label htmlFor="includeAnalytics">Include analytics</Label>
              </div>
            </div>
          </div>

          {/* Sorting */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Sort By</Label>
              <Select
                value={exportOptions.sortBy}
                onChange={(e) => updateExportOptions({ sortBy: e.target.value })}
              >
                <SelectItem value="created_at">Created Date</SelectItem>
                <SelectItem value="updated_at">Updated Date</SelectItem>
                <SelectItem value="applicant_name">Applicant Name</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="is_completed">Status</SelectItem>
              </Select>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Select
                value={exportOptions.sortOrder}
                onChange={(e) => updateExportOptions({ sortOrder: e.target.value as 'asc' | 'desc' })}
              >
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </Select>
            </div>
          </div>

          {/* Progress Bar */}
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Exporting...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 