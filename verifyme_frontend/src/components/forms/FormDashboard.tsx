'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FormView } from './FormView'
import { DataGrid } from '@/components/ui/data-grid'
import { FormEntry, FormSchema } from '@/types/api'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, Table, FileText, RefreshCw, Download, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface FormDashboardProps {
  title?: string
  description?: string
}

export function FormDashboard({ 
  title = "Form Management",
  description = "Create and manage form entries with a user-friendly interface"
}: FormDashboardProps) {
  const { user } = useAuth() as { user: { organization: string; id: string } }
  const [activeTab, setActiveTab] = useState('form')
  const [formEntries, setFormEntries] = useState<FormEntry[]>([])
  const [selectedSchema, setSelectedSchema] = useState<FormSchema | null>(null)
  const [schemas, setSchemas] = useState<FormSchema[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<FormEntry | null>(null)

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch form entries
      const entriesResponse = await apiClient.getFormEntries()
      const entries = Array.isArray(entriesResponse)
        ? entriesResponse
        : entriesResponse.results || entriesResponse.entries || []
      setFormEntries(entries)
      
      // Fetch form schemas
      const schemasResponse = await apiClient.getFormSchemas({ is_active: true })
      const activeSchemas = schemasResponse.results || []
      setSchemas(activeSchemas)
      
      if (activeSchemas.length > 0 && !selectedSchema) {
        setSelectedSchema(activeSchemas[0])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleEntryCreated = (newEntry: FormEntry) => {
    setFormEntries(prev => [newEntry, ...prev])
    setActiveTab('table')
    toast.success('Entry created successfully!')
  }

  const handleRowClick = (entry: FormEntry) => {
    setSelectedEntry(entry)
  }

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const blob = await apiClient.exportData({
        format,
        filters: {}
      })
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `form-entries-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`Exported to ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-600">{description}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setActiveTab('form')}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Entry
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
          
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Form Entry
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            Data Table ({formEntries.length})
          </TabsTrigger>
        </TabsList>

        {/* Form Entry Tab */}
        <TabsContent value="form" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormView
                schema={selectedSchema || undefined}
                onEntryCreated={handleEntryCreated}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Table Tab */}
        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                All Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading entries...</span>
                </div>
              ) : formEntries.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No entries found</p>
                    <p className="text-gray-400 text-sm">Create your first entry using the form above</p>
                  </div>
                </div>
              ) : (
                <DataGrid
                  data={formEntries}
                  onRowClick={handleRowClick}
                  readOnly={false}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Entry Details Modal */}
      {selectedEntry && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Entry Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Entry Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">ID:</span> {selectedEntry.id}</div>
                  <div><span className="font-medium">Status:</span> 
                    {selectedEntry.is_verified ? 'Verified' : 
                     selectedEntry.is_completed ? 'Completed' : 'Pending'}
                  </div>
                  <div><span className="font-medium">Created:</span> 
                    {new Date(selectedEntry.created_at).toLocaleString()}
                  </div>
                  <div><span className="font-medium">Employee:</span> 
                    {selectedEntry.employee.first_name} {selectedEntry.employee.last_name}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Form Data</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(selectedEntry.form_data).map(([key, value]) => (
                    <div key={key}>
                      <span className="font-medium">{key}:</span> {String(value)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => setSelectedEntry(null)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 