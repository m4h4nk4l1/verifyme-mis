'use client'

import React, { useMemo, useCallback, useEffect, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { ColDef, GridReadyEvent, ICellRendererParams, ValueFormatterParams, CellClassParams, RowClickedEvent, CellValueChangedEvent } from 'ag-grid-community'
import '@/lib/ag-grid-modules' // Import AG Grid modules registration
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { FormEntry, CaseStatus, ProductType, SupportedState } from '@/types'

interface DataGridProps {
  data: FormEntry[]
  onRowClick?: (row: FormEntry) => void
  onCellEdit?: (row: FormEntry, field: string, value: unknown) => void
  readOnly?: boolean
}

export function DataGrid({ data, onRowClick, onCellEdit, readOnly = false }: DataGridProps) {
  // Track duplicate fields for highlighting
  const [duplicateFields, setDuplicateFields] = useState<Set<string>>(new Set())

  // Calculate duplicate fields on data change
  useEffect(() => {
    const duplicates = new Set<string>()
    const fieldValues = new Map<string, Set<string>>()

    data.forEach(entry => {
      const formData = entry.form_data as Record<string, unknown>
      Object.entries(formData).forEach(([field, value]) => {
        if (!fieldValues.has(field)) {
          fieldValues.set(field, new Set())
        }
        const values = fieldValues.get(field)!
        const stringValue = String(value)
        if (values.has(stringValue)) {
          duplicates.add(field)
        } else {
          values.add(stringValue)
        }
      })
    })

    setDuplicateFields(duplicates)
  }, [data])

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      headerName: 'Sr No.',
      field: 'id',
      width: 80,
      sortable: true,
      filter: true,
      pinned: 'left',
      valueGetter: (params) => {
        return params.node?.rowIndex !== null && params.node?.rowIndex !== undefined ? params.node.rowIndex + 1 : 1
      }
    },
    {
      headerName: 'Submitted By',
      field: 'employee.first_name',
      width: 120,
      sortable: true,
      filter: true,
      valueGetter: (params) => {
        return `${params.data.employee.first_name} ${params.data.employee.last_name}`
      }
    },
    {
      headerName: 'Case Status',
      field: 'form_data.case_status',
      width: 120,
      sortable: true,
      filter: true,
      valueGetter: (params) => {
        const formData = params.data.form_data as Record<string, unknown>
        return formData.case_status || 'Pending'
      },
      cellRenderer: (params: ICellRendererParams) => {
        const status = params.value as CaseStatus
        const statusColors = {
          'Positive': 'bg-green-100 text-green-800',
          'Negative': 'bg-red-100 text-red-800',
          'Profile Decline': 'bg-yellow-100 text-yellow-800',
          'Pending': 'bg-blue-100 text-blue-800',
          'In Progress': 'bg-purple-100 text-purple-800',
          'Approved': 'bg-green-100 text-green-800',
          'Rejected': 'bg-red-100 text-red-800'
        }
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
          </span>
        )
      }
    },
    {
      headerName: 'Product Type',
      field: 'form_data.product_type',
      width: 120,
      sortable: true,
      filter: true,
      valueGetter: (params) => {
        const formData = params.data.form_data as Record<string, unknown>
        return formData.product_type || '-'
      },
      cellRenderer: (params: ICellRendererParams) => {
        const productType = params.value as ProductType
        return productType || '-'
      }
    },
    {
      headerName: 'Location',
      field: 'form_data.location',
      width: 100,
      sortable: true,
      filter: true,
      valueGetter: (params) => {
        const formData = params.data.form_data as Record<string, unknown>
        return formData.location || '-'
      },
      cellRenderer: (params: ICellRendererParams) => {
        const location = params.value as SupportedState
        return location || '-'
      }
    },
    {
      headerName: 'Bank/NBFC',
      field: 'form_data.bank_nbfc_name',
      width: 120,
      sortable: true,
      filter: true,
      valueGetter: (params) => {
        const formData = params.data.form_data as Record<string, unknown>
        return formData.bank_nbfc_name || '-'
      },
      cellRenderer: (params: ICellRendererParams) => {
        return params.value || '-'
      }
    },
    {
      headerName: 'Field Verifier',
      field: 'form_data.field_verifier_name',
      width: 120,
      sortable: true,
      filter: true,
      valueGetter: (params) => {
        const formData = params.data.form_data as Record<string, unknown>
        return formData.field_verifier_name || '-'
      },
      cellRenderer: (params: ICellRendererParams) => {
        return params.value || '-'
      }
    },
    {
      headerName: 'Back Office Exec',
      field: 'form_data.back_office_executive_name',
      width: 140,
      sortable: true,
      filter: true,
      valueGetter: (params) => {
        const formData = params.data.form_data as Record<string, unknown>
        return formData.back_office_executive_name || '-'
      },
      cellRenderer: (params: ICellRendererParams) => {
        return params.value || '-'
      }
    },
    {
      headerName: 'Repeat Case',
      field: 'form_data.is_repeat_case',
      width: 100,
      sortable: true,
      filter: true,
      valueGetter: (params) => {
        const formData = params.data.form_data as Record<string, unknown>
        return formData.is_repeat_case || false
      },
      cellRenderer: (params: ICellRendererParams) => {
        return params.value ? 'Yes' : 'No'
      }
    },
    {
      headerName: 'Out of TAT',
      field: 'is_out_of_tat',
      width: 100,
      sortable: true,
      filter: true,
      valueGetter: (params) => {
        return params.data.is_out_of_tat || params.data.check_tat_status?.() || false
      },
      cellRenderer: (params: ICellRendererParams) => {
        const isOutOfTat = params.value
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${
            isOutOfTat ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
          }`}>
            {isOutOfTat ? 'Yes' : 'No'}
          </span>
        )
      }
    },
    {
      headerName: 'Created At',
      field: 'created_at',
      width: 150,
      sortable: true,
      filter: true,
      valueFormatter: (params: ValueFormatterParams) => {
        return new Date(params.value).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    },
    {
      headerName: 'Updated At',
      field: 'updated_at',
      width: 150,
      sortable: true,
      filter: true,
      valueFormatter: (params: ValueFormatterParams) => {
        return new Date(params.value).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    }
  ], [duplicateFields])

  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    editable: !readOnly,
    cellClassRules: {
      'duplicate-highlight': (params: CellClassParams<FormEntry, unknown, unknown>) => {
        const fieldName = params.colDef.field as string
        if (!fieldName || !duplicateFields.has(fieldName)) return false
        
        const cellValue = params.value
        if (!cellValue) return false
        if (!params.data) return false
        
        // Check if this value appears in other rows
        const duplicateCount = data.filter((row: FormEntry) => {
          const formData = row.form_data as Record<string, unknown>
          return formData[fieldName] === cellValue && row.id !== params.data?.id
        }).length
        
        return duplicateCount > 0
      },
      'recent-submit': (params: CellClassParams<FormEntry, unknown, unknown>) => {
        if (!params.data) return false
        const createdAt = new Date(params.data.created_at)
        const now = new Date()
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
        return hoursDiff <= 24
      },
      'out-of-tat': (params: CellClassParams<FormEntry, unknown, unknown>) => {
        return !!params.data?.is_out_of_tat
      },
      'pending-status': (params: CellClassParams<FormEntry, unknown, unknown>) => {
        if (!params.data) return false
        const formData = params.data.form_data as Record<string, unknown>
        return formData.case_status === 'Pending'
      }
    }
  }), [data, readOnly, duplicateFields])

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit()
  }, [])

  const onRowClicked = useCallback((event: RowClickedEvent<FormEntry>) => {
    if (event.data) onRowClick?.(event.data)
  }, [onRowClick])

  const onCellValueChanged = useCallback((event: CellValueChangedEvent<FormEntry>) => {
    if (event.data && event.colDef.field) {
      onCellEdit?.(event.data, event.colDef.field, event.newValue)
    }
  }, [onCellEdit])

  return (
    <div className="ag-theme-alpine w-full h-[600px]">
      <style jsx>{`
        .excel-grid {
          --ag-grid-color: #000;
          --ag-grid-background-color: #fff;
          --ag-header-background-color: #f8f9fa;
          --ag-header-foreground-color: #495057;
          --ag-border-color: #dee2e6;
          --ag-row-hover-color: #f8f9fa;
          --ag-selected-row-background-color: #e3f2fd;
          --ag-font-size: 14px;
          --ag-font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        
        .excel-grid .ag-header-cell {
          border-right: 1px solid #dee2e6;
          border-bottom: 1px solid #dee2e6;
          font-weight: 600;
        }
        
        .excel-grid .ag-cell {
          border-right: 1px solid #dee2e6;
          border-bottom: 1px solid #dee2e6;
        }
        
        .excel-grid .duplicate-highlight {
          background-color: #fff3cd !important;
          animation: duplicate-flash 3s ease-in-out;
        }
        
        .excel-grid .recent-submit {
          background-color: #d1ecf1 !important;
        }
        
        .excel-grid .out-of-tat {
          background-color: #f8d7da !important;
        }
        
        .excel-grid .pending-status {
          background-color: #fff3cd !important;
        }
        
        @keyframes duplicate-flash {
          0%, 100% { background-color: #fff3cd; }
          50% { background-color: #ffc107; }
        }
      `}</style>
      
      <AgGridReact
        rowData={data}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        onGridReady={onGridReady}
        onRowClicked={onRowClicked}
        onCellValueChanged={onCellValueChanged}
        pagination={true}
        paginationPageSize={50}
        rowSelection="single"
        animateRows={true}
        enableCellTextSelection={true}
        suppressRowClickSelection={true}
        suppressCellFocus={readOnly}
        domLayout="autoHeight"
        className="excel-grid"
      />
    </div>
  )
} 