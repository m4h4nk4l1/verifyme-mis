'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ColDef, GridApi, GridReadyEvent, CellEditingStoppedEvent, ICellRendererParams, GridOptions } from 'ag-grid-community'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AdvancedFilters } from './AdvancedFilters'
import { FileUploadCell } from './FileUploadCell'
import { DuplicateHighlightCell } from './DuplicateHighlightCell'
import { 
  Download, 
  Save,
  RefreshCw,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { FormEntry, FormEntryFilters, FormSchema, FormField } from '@/types/api'
import { apiClient } from '@/lib/api'
import '@/lib/ag-grid-modules' // Import AG Grid modules registration
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

interface AGGridFormEntryProps {
  title?: string
  description?: string
  showFilters?: boolean
  onEntryEdit?: (entry: FormEntry) => void
  onEntryComplete?: (entry: FormEntry) => void
}

export function AGGridFormEntry({
  title = "Form Entries - Excel View",
  description = "Spreadsheet-style data entry with advanced features",
  showFilters = true,
  onEntryEdit,
  onEntryComplete
}: AGGridFormEntryProps) {
  const gridRef = useRef<AgGridReact>(null)
  const [gridApi, setGridApi] = useState<GridApi | null>(null)
  const [entries, setEntries] = useState<FormEntry[]>([])
  const [schemas, setSchemas] = useState<FormSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<FormEntryFilters>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedSchema, setSelectedSchema] = useState<string>('')
  const [duplicateHighlights, setDuplicateHighlights] = useState<Set<string>>(new Set())
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)


  // Fetch form schemas
  const fetchSchemas = async () => {
    try {
      const response = await apiClient.getFormSchemas({ is_active: true })
      setSchemas(response.results)
      if (response.results.length > 0) {
        setSelectedSchema(response.results[0].id)
      }
    } catch (err) {
      console.error('Error fetching schemas:', err)
    }
  }

  // Fetch form entries
  const fetchEntries = async () => {
    try {
      setLoading(true)
      
      const response = await apiClient.getFormEntries({
        ...filters,
        search: searchTerm || undefined,
        formSchema: selectedSchema || undefined,
      })
      
      setEntries(response.results)
      setTotalCount(response.count)
      
      // Check for duplicates and highlight them
      checkDuplicates(response.results)
    } catch (err) {
      console.error('Error fetching entries:', err)
    } finally {
      setLoading(false)
    }
  }

  // Check for duplicate entries and highlight them
  const checkDuplicates = useCallback((data: FormEntry[]) => {
    const duplicates = new Set<string>()
    const seen = new Map<string, string[]>()
    
    data.forEach((entry) => {
      // Create a key based on critical fields for duplicate detection
      const key = createDuplicateKey(entry)
      if (key) {
        if (seen.has(key)) {
          duplicates.add(key)
          seen.get(key)!.push(entry.id)
        } else {
          seen.set(key, [entry.id])
        }
      }
    })
    
    setDuplicateHighlights(duplicates)
  }, [])

  // Create duplicate detection key
  const createDuplicateKey = (entry: FormEntry) => {
    const criticalFields = ['applicant_name', 'pan_card', 'aadhar_number', 'phone_number']
    const values = criticalFields.map(field => entry.form_data[field]).filter(Boolean)
    return values.length > 0 ? values.join('|') : null
  }

  // Generate dynamic columns based on form schema
  const generateColumns = useMemo((): ColDef[] => {
    if (!schemas.length || !selectedSchema) return []

    const schema = schemas.find(s => s.id === selectedSchema)
    if (!schema) return []

    const baseColumns: ColDef[] = [
      {
        headerName: 'ID',
        field: 'id',
        width: 100,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams) => (
          <div className="text-xs text-gray-500">{params.value?.slice(0, 8)}...</div>
        ),
        sortable: true,
        filter: true
      },
      {
        headerName: 'Employee',
        field: 'employee.first_name',
        width: 120,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams) => (
          <div className="text-sm">
            {params.data?.employee?.first_name} {params.data?.employee?.last_name}
          </div>
        ),
        sortable: true,
        filter: true
      },
      {
        headerName: 'Status',
        field: 'is_completed',
        width: 100,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams) => {
          const entry = params.data as FormEntry
          if (entry.is_verified) {
            return <CheckCircle className="h-4 w-4 text-green-600" />
          } else if (entry.is_completed) {
            return <Clock className="h-4 w-4 text-yellow-600" />
          } else {
            return <AlertTriangle className="h-4 w-4 text-red-600" />
          }
        },
        sortable: true,
        filter: true
      },
      {
        headerName: 'TAT',
        field: 'is_out_of_tat',
        width: 80,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams) => {
          const entry = params.data as FormEntry
          return entry.is_out_of_tat ? (
            <span className="text-red-600 text-xs font-medium">Out</span>
          ) : (
            <span className="text-green-600 text-xs font-medium">OK</span>
          )
        },
        sortable: true,
        filter: true
      },
      {
        headerName: 'Created',
        field: 'created_at',
        width: 120,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams) => (
          <div className="text-xs">
            {new Date(params.value).toLocaleDateString('en-IN')}
          </div>
        ),
        sortable: true,
        filter: true
      }
    ]

    // Add dynamic columns based on schema fields
    const dynamicColumns: ColDef[] = schema.fields_definition?.map((field: FormField) => ({
      headerName: field.display_name || field.name,
      field: `form_data.${field.name}`,
      width: 150,
      editable: true,
      cellEditor: field.field_type === 'BOOLEAN' ? 'agCheckboxCellEditor' : 'agTextCellEditor',
      cellRenderer: (params: ICellRendererParams) => {
        const value = params.value
        const entry = params.data as FormEntry
        const duplicateKey = createDuplicateKey(entry)
        const isDuplicate = duplicateKey && duplicateHighlights.has(duplicateKey)
        
        // Check if this field should be a file upload (based on field name or custom logic)
        if (field.name.toLowerCase().includes('file') || field.name.toLowerCase().includes('document')) {
          return (
            <FileUploadCell
              value={value}
              entryId={entry.id}
              fieldName={field.name}
              onUploadComplete={(file) => handleFileUpload(entry.id, field.name, file)}
            />
          )
        }
        
        return (
          <DuplicateHighlightCell
            value={value}
            isDuplicate={isDuplicate || false}
            fieldType={field.field_type}
          />
        )
      },
      cellStyle: (params) => {
        const entry = params.data as FormEntry
        const duplicateKey = createDuplicateKey(entry)
        const isDuplicate = duplicateKey && duplicateHighlights.has(duplicateKey)
        
        return isDuplicate ? { 
          backgroundColor: '#fed7aa'
        } : undefined
      },
      sortable: true,
      filter: true,
      resizable: true
    })) || []

    // Add action column
    const actionColumn: ColDef = {
      headerName: 'Actions',
      width: 150,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams) => {
        const entry = params.data as FormEntry
        return (
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEntryEdit?.(entry)}
            >
              Edit
            </Button>
            {!entry.is_completed && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEntryComplete?.(entry)}
              >
                Complete
              </Button>
            )}
          </div>
        )
      },
      sortable: false,
      filter: false
    }

    return [...baseColumns, ...dynamicColumns, actionColumn]
  }, [schemas, selectedSchema, duplicateHighlights, onEntryEdit, onEntryComplete])

  // Handle cell editing
  const onCellEditingStopped = useCallback(async (params: CellEditingStoppedEvent) => {
    const { data, colDef, newValue } = params
    if (!data || !colDef?.field) return

    try {
      // Update the form data
      const updatedData = { ...data.form_data }
      const fieldName = colDef.field!.replace('form_data.', '')
      updatedData[fieldName] = newValue

      // Save to backend
      await apiClient.updateFormEntry(data.id, {
        form_data: updatedData
      })

      // Update local state
      setEntries(prev => prev.map(entry => 
        entry.id === data.id 
          ? { ...entry, form_data: updatedData }
          : entry
      ))

      // Check for duplicates after update
      const updatedEntries = entries.map(entry => 
        entry.id === data.id 
          ? { ...entry, form_data: updatedData }
          : entry
      )
      checkDuplicates(updatedEntries)

      // Auto-save notification
      if (autoSaveEnabled) {
        // Auto-save functionality
      }

    } catch (err) {
      console.error('Error updating entry:', err)
      // Revert the change in the grid
      if (gridApi) {
        gridApi.refreshCells({ force: true })
      }
    }
  }, [entries, gridApi, checkDuplicates, autoSaveEnabled])

  // Handle file upload
  const handleFileUpload = async (entryId: string, fieldName: string, file: File) => {
    try {
      const attachment = await apiClient.uploadFile(entryId, file, `Uploaded for ${fieldName}`)
      
      // Update the form data with file reference
      const entry = entries.find(e => e.id === entryId)
      if (entry) {
        const updatedData = { ...entry.form_data }
        updatedData[fieldName] = attachment.id

        await apiClient.updateFormEntry(entryId, {
          form_data: updatedData
        })

        // Refresh the grid
        fetchEntries()
      }
    } catch (err) {
      console.error('Error uploading file:', err)
    }
  }

  // Handle grid ready
  const onGridReady = (params: GridReadyEvent) => {
    setGridApi(params.api)
  }

  // Handle filters change
  const handleFiltersChange = (newFilters: FormEntryFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  // Handle export
  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const blob = await apiClient.exportData({
        format,
        filters: {
          ...filters,
          search: searchTerm || undefined,
          formSchema: selectedSchema || undefined,
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

  // Grid options for advanced features
  const gridOptions: GridOptions = {
    getRowStyle: (params) => {
      const entry = params.data as FormEntry
      const duplicateKey = createDuplicateKey(entry)
      const isDuplicate = duplicateKey && duplicateHighlights.has(duplicateKey)
      
      return isDuplicate ? { 
        backgroundColor: '#fed7aa'
      } : undefined
    },
    enableRangeSelection: true,
    enableFillHandle: true,
    enableCellTextSelection: true,
    suppressCopyRowsToClipboard: false,
    suppressCopySingleCellRanges: false,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 100,
      editable: false, // Will be overridden for specific columns
    },
    pagination: true,
    paginationPageSize: 50,
    rowSelection: 'multiple',
    suppressRowClickSelection: true,
  }

  // Effects
  useEffect(() => {
    fetchSchemas()
  }, [])

  useEffect(() => {
    if (selectedSchema) {
      fetchEntries()
    }
  }, [filters, searchTerm, currentPage, selectedSchema])

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
            onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
            variant={autoSaveEnabled ? "default" : "outline"}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            Auto-save {autoSaveEnabled ? 'ON' : 'OFF'}
          </Button>
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

      {/* Schema Selection */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Form Schema:</label>
        <select
          value={selectedSchema}
          onChange={(e) => setSelectedSchema(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {schemas.map((schema) => (
            <option key={schema.id} value={schema.id}>
              {schema.name}
            </option>
          ))}
        </select>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search entries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        {showFilters && (
          <AdvancedFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={() => {
              setFilters({})
              setSearchTerm('')
              setCurrentPage(1)
            }}
            isLoading={loading}
          />
        )}
      </div>

      {/* AG-Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="ag-theme-alpine w-full h-[600px]">
            <AgGridReact
              ref={gridRef}
              rowData={entries}
              columnDefs={generateColumns}
              onGridReady={onGridReady}
              onCellEditingStopped={onCellEditingStopped}
              gridOptions={gridOptions}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>
          Total Entries: {totalCount} | 
          Showing: {entries.length} | 
          Duplicates: {duplicateHighlights.size}
        </div>
        <div>
          {selectedSchema && (
            <span>
              Schema: {schemas.find(s => s.id === selectedSchema)?.name}
            </span>
          )}
        </div>
      </div>
    </div>
  )
} 