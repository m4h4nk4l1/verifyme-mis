'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  FileText, 
  AlertTriangle, 
  Download, 
  Eye,
  RefreshCw,
  TrendingUp
} from 'lucide-react'
import { AGGridFormEntry } from './AGGridFormEntry'
import { DuplicateDetection } from './DuplicateDetection'
import { FilePreview } from './FilePreview'
import { AdvancedExport } from './AdvancedExport'
import { FormEntry, FormEntryFilters, FileAttachment } from '@/types/api'
import { apiClient } from '@/lib/api'

interface FormEntryDashboardProps {
  title?: string
  description?: string
}

export function FormEntryDashboard({ 
  title = "Form Entries Management",
  description = "Comprehensive form entry management with Excel-like interface, duplicate detection, and advanced export"
}: FormEntryDashboardProps) {
  const [activeTab, setActiveTab] = useState('excel-view')
  const [entries, setEntries] = useState<FormEntry[]>([])
  const [filters] = useState<FormEntryFilters>({})
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    verified: 0,
    outOfTat: 0,
    duplicates: 0
  })
  const [showExport, setShowExport] = useState(false)
  const [selectedFile, setSelectedFile] = useState<FileAttachment | null>(null)
  const [showFilePreview, setShowFilePreview] = useState(false)

  // Fetch entries and stats
  const fetchData = async () => {
    try {
      setLoading(true)
      const [entriesResponse, statsResponse] = await Promise.all([
        apiClient.getFormEntries(filters),
        apiClient.getFormEntryStatistics(filters)
      ])
      
      setEntries(entriesResponse.results)
      setStats({
        total: statsResponse.total_entries,
        completed: statsResponse.completed_entries,
        verified: statsResponse.verified_entries,
        outOfTat: statsResponse.out_of_tat_entries,
        duplicates: 0 // Will be calculated by duplicate detection
      })
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }



  // Handle duplicate detection
  const handleDuplicateSelect = (duplicates: FormEntry[]) => {
    // Handle duplicate selection
  }

  // Handle duplicate resolution
  const handleResolveDuplicate = (entryId: string, action: 'keep' | 'merge' | 'delete') => {
    // Handle duplicate resolution
  }

  // Handle file preview
  const handleFilePreview = (file: FileAttachment) => {
    setSelectedFile(file)
    setShowFilePreview(true)
  }

  // Handle export
  const handleExport = () => {
    setShowExport(true)
  }

  // Handle export complete
  const handleExportComplete = () => {
    setShowExport(false)
    fetchData() // Refresh data after export
  }

  // Effects
  useEffect(() => {
    fetchData()
  }, [filters])

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    )
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
            onClick={fetchData}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Table className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-blue-600">{stats.verified}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Out of TAT</p>
                <p className="text-2xl font-bold text-red-600">{stats.outOfTat}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Duplicates</p>
                <p className="text-2xl font-bold text-orange-600">{stats.duplicates}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="excel-view" className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            Excel View
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Duplicates
            {stats.duplicates > 0 && (
              <Badge variant="destructive" className="ml-1">
                {stats.duplicates}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Files
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="excel-view" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                Excel-like Data Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AGGridFormEntry
                title="Form Entries - Excel View"
                description="Spreadsheet-style data entry with advanced features"
                showFilters={true}
                onEntryEdit={(entry) => {}}
                onEntryComplete={(entry) => {}}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Duplicate Detection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DuplicateDetection
                entries={entries}
                onDuplicateSelect={handleDuplicateSelect}
                onResolveDuplicate={handleResolveDuplicate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                File Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <FileText className="h-6 w-6 text-blue-500" />
                      <Button
                        onClick={() => handleFilePreview({} as FileAttachment)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <p className="font-medium text-sm truncate">Sample File</p>
                      <p className="text-xs text-gray-600">1.2 KB</p>
                      <p className="text-xs text-gray-500">
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Analytics & Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Performance Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Completion Rate</span>
                      <span className="font-medium">
                        {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Verification Rate</span>
                      <span className="font-medium">
                        {stats.total > 0 ? ((stats.verified / stats.total) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>TAT Compliance</span>
                      <span className="font-medium">
                        {stats.total > 0 ? (((stats.total - stats.outOfTat) / stats.total) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-4">Recent Activity</h4>
                  <div className="space-y-2">
                    {entries.slice(0, 5).map(entry => (
                      <div key={entry.id} className="flex items-center justify-between text-sm">
                        <span className="truncate">
                          {entry.form_data?.applicant_name || 'Unknown'}
                        </span>
                        <Badge variant={entry.is_completed ? "default" : "secondary"}>
                          {entry.is_completed ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showExport && (
        <AdvancedExport
          filters={filters}
          onExportComplete={handleExportComplete}
          onCancel={() => setShowExport(false)}
        />
      )}

      {showFilePreview && selectedFile && (
        <FilePreview
          file={selectedFile}
          onClose={() => setShowFilePreview(false)}
          onDownload={(fileId) => {}}
        />
      )}
    </div>
  )
}

// Helper component for CheckCircle icon
function CheckCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
} 