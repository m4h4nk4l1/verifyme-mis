'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FormView } from './FormView'
import { DataGrid } from '@/components/ui/data-grid'
import { FormEntry, FormSchema } from '@/types/api'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { 
  Plus, 
  Table, 
  FileText, 
  RefreshCw, 
  Download, 
  Eye, 
  Search,
  Filter,
  Calendar,
  Building,
  MapPin,
  Package,
  AlertTriangle,
  User,
  Clock,
  Repeat
} from 'lucide-react'
import { toast } from 'sonner'

interface FormDashboardProps {
  title?: string
  description?: string
}

interface FilterState {
  search: string
  dateFrom: string
  dateTo: string
  month: string
  year: string
  bankNbfc: string
  location: string
  productType: string
  caseStatus: string
  repeatCase: string
  fieldVerifier: string
  backOfficeExec: string
  outOfTat: string
}

export function EnhancedFormDashboard({ 
  title = "Enhanced Form Management",
  description = "Create and manage form entries with advanced search and filtering"
}: FormDashboardProps) {
  const { user } = useAuth() as { user: { organization: string; id: string } }
  const [activeTab, setActiveTab] = useState('form')
  const [formEntries, setFormEntries] = useState<FormEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<FormEntry[]>([])
  const [selectedSchema, setSelectedSchema] = useState<FormSchema | null>(null)
  const [schemas, setSchemas] = useState<FormSchema[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<FormEntry | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    dateFrom: '',
    dateTo: '',
    month: '',
    year: '',
    bankNbfc: '',
    location: '',
    productType: '',
    caseStatus: '',
    repeatCase: '',
    fieldVerifier: '',
    backOfficeExec: '',
    outOfTat: ''
  })

  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    banks: [] as string[],
    locations: [] as string[],
    productTypes: [] as string[],
    caseStatuses: [] as string[],
    fieldVerifiers: [] as string[],
    backOfficeExecs: [] as string[]
  })

  // Fetch data on component mount
  useEffect(() => {
    fetchData()
  }, [])

  // Memoize the applyFilters function to prevent infinite loops
  const applyFilters = useCallback(() => {
    let filtered = [...formEntries]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(entry => {
        const formData = entry.form_data as Record<string, unknown>
        return Object.values(formData).some(value => 
          String(value).toLowerCase().includes(searchLower)
        ) || 
        entry.employee.first_name.toLowerCase().includes(searchLower) ||
        entry.employee.last_name.toLowerCase().includes(searchLower)
      })
    }

    // Date filters
    if (filters.dateFrom) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.created_at)
        const fromDate = new Date(filters.dateFrom)
        return entryDate >= fromDate
      })
    }

    if (filters.dateTo) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.created_at)
        const toDate = new Date(filters.dateTo)
        return entryDate <= toDate
      })
    }

    if (filters.month) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.created_at)
        return entryDate.getMonth() === parseInt(filters.month)
      })
    }

    if (filters.year) {
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.created_at)
        return entryDate.getFullYear() === parseInt(filters.year)
      })
    }

    // Field-specific filters
    if (filters.bankNbfc) {
      filtered = filtered.filter(entry => {
        const formData = entry.form_data as Record<string, unknown>
        return formData.bank_nbfc_name === filters.bankNbfc
      })
    }

    if (filters.location) {
      filtered = filtered.filter(entry => {
        const formData = entry.form_data as Record<string, unknown>
        return formData.location === filters.location
      })
    }

    if (filters.productType) {
      filtered = filtered.filter(entry => {
        const formData = entry.form_data as Record<string, unknown>
        return formData.product_type === filters.productType
      })
    }

    if (filters.caseStatus) {
      filtered = filtered.filter(entry => {
        const formData = entry.form_data as Record<string, unknown>
        return formData.case_status === filters.caseStatus
      })
    }

    if (filters.repeatCase) {
      filtered = filtered.filter(entry => {
        const formData = entry.form_data as Record<string, unknown>
        const isRepeat = formData.is_repeat_case === true || formData.is_repeat_case === 'true'
        return filters.repeatCase === 'yes' ? isRepeat : !isRepeat
      })
    }

    if (filters.fieldVerifier) {
      filtered = filtered.filter(entry => {
        const formData = entry.form_data as Record<string, unknown>
        return formData.field_verifier_name === filters.fieldVerifier
      })
    }

    if (filters.backOfficeExec) {
      filtered = filtered.filter(entry => {
        const formData = entry.form_data as Record<string, unknown>
        return formData.back_office_executive_name === filters.backOfficeExec
      })
    }

    // TAT filter
    if (filters.outOfTat) {
      const now = new Date()
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.created_at)
        const hoursDiff = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60)
        const isOutOfTat = hoursDiff > 24 // Assuming 24 hours TAT
        return filters.outOfTat === 'yes' ? isOutOfTat : !isOutOfTat
      })
    }

    setFilteredEntries(filtered)
  }, [formEntries, filters])

  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters()
  }, [applyFilters])

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

      // Extract filter options from entries
      extractFilterOptions(entries)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const extractFilterOptions = (entries: FormEntry[]) => {
    const banks = new Set<string>()
    const locations = new Set<string>()
    const productTypes = new Set<string>()
    const caseStatuses = new Set<string>()
    const fieldVerifiers = new Set<string>()
    const backOfficeExecs = new Set<string>()

    entries.forEach(entry => {
      const formData = entry.form_data as Record<string, unknown>
      
      if (formData.bank_nbfc_name) banks.add(String(formData.bank_nbfc_name))
      if (formData.location) locations.add(String(formData.location))
      if (formData.product_type) productTypes.add(String(formData.product_type))
      if (formData.case_status) caseStatuses.add(String(formData.case_status))
      if (formData.field_verifier_name) fieldVerifiers.add(String(formData.field_verifier_name))
      if (formData.back_office_executive_name) backOfficeExecs.add(String(formData.back_office_executive_name))
    })

    setFilterOptions({
      banks: Array.from(banks).sort(),
      locations: Array.from(locations).sort(),
      productTypes: Array.from(productTypes).sort(),
      caseStatuses: Array.from(caseStatuses).sort(),
      fieldVerifiers: Array.from(fieldVerifiers).sort(),
      backOfficeExecs: Array.from(backOfficeExecs).sort()
    })
  }

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      dateFrom: '',
      dateTo: '',
      month: '',
      year: '',
      bankNbfc: '',
      location: '',
      productType: '',
      caseStatus: '',
      repeatCase: '',
      fieldVerifier: '',
      backOfficeExec: '',
      outOfTat: ''
    })
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
        filters: filters
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

  const getMonthOptions = () => {
    return [
      { value: '', label: 'All Months' },
      { value: '0', label: 'January' },
      { value: '1', label: 'February' },
      { value: '2', label: 'March' },
      { value: '3', label: 'April' },
      { value: '4', label: 'May' },
      { value: '5', label: 'June' },
      { value: '6', label: 'July' },
      { value: '7', label: 'August' },
      { value: '8', label: 'September' },
      { value: '9', label: 'October' },
      { value: '10', label: 'November' },
      { value: '11', label: 'December' }
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
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide' : 'Show'} Filters
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

      {/* Search and Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search in all fields..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Date From</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">Date To</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>

              {/* Month */}
              <div className="space-y-2">
                <Label htmlFor="month">Month</Label>
                <select
                  id="month"
                  value={filters.month}
                  onChange={(e) => handleFilterChange('month', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="">Select Month</option>
                  {getMonthOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <select
                  id="year"
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="">Select Year</option>
                  {getYearOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bank/NBFC */}
              <div className="space-y-2">
                <Label htmlFor="bankNbfc">Bank/NBFC</Label>
                <select
                  id="bankNbfc"
                  value={filters.bankNbfc}
                  onChange={(e) => handleFilterChange('bankNbfc', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="">All Banks/NBFCs</option>
                  {filterOptions.banks.map(bank => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <select
                  id="location"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="">All Locations</option>
                  {filterOptions.locations.map(location => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Type */}
              <div className="space-y-2">
                <Label htmlFor="productType">Product Type</Label>
                <select
                  id="productType"
                  value={filters.productType}
                  onChange={(e) => handleFilterChange('productType', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="">All Product Types</option>
                  {filterOptions.productTypes.map(productType => (
                    <option key={productType} value={productType}>
                      {productType}
                    </option>
                  ))}
                </select>
              </div>

              {/* Case Status */}
              <div className="space-y-2">
                <Label htmlFor="caseStatus">Case Status</Label>
                <select
                  id="caseStatus"
                  value={filters.caseStatus}
                  onChange={(e) => handleFilterChange('caseStatus', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="">All Statuses</option>
                  {filterOptions.caseStatuses.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Repeat Case */}
              <div className="space-y-2">
                <Label htmlFor="repeatCase">Repeat Case</Label>
                <select
                  id="repeatCase"
                  value={filters.repeatCase}
                  onChange={(e) => handleFilterChange('repeatCase', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="">All Cases</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              {/* Field Verifier */}
              <div className="space-y-2">
                <Label htmlFor="fieldVerifier">Field Verifier</Label>
                <select
                  id="fieldVerifier"
                  value={filters.fieldVerifier}
                  onChange={(e) => handleFilterChange('fieldVerifier', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="">All Field Verifiers</option>
                  {filterOptions.fieldVerifiers.map(verifier => (
                    <option key={verifier} value={verifier}>
                      {verifier}
                    </option>
                  ))}
                </select>
              </div>

              {/* Back Office Executive */}
              <div className="space-y-2">
                <Label htmlFor="backOfficeExec">Back Office Executive</Label>
                <select
                  id="backOfficeExec"
                  value={filters.backOfficeExec}
                  onChange={(e) => handleFilterChange('backOfficeExec', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="">All Back Office Executives</option>
                  {filterOptions.backOfficeExecs.map(exec => (
                    <option key={exec} value={exec}>
                      {exec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Out of TAT */}
              <div className="space-y-2">
                <Label htmlFor="outOfTat">Out of TAT</Label>
                <select
                  id="outOfTat"
                  value={filters.outOfTat}
                  onChange={(e) => handleFilterChange('outOfTat', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                >
                  <option value="">All TAT Status</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-end mt-4 gap-2">
              <Button
                onClick={clearFilters}
                variant="outline"
                size="sm"
              >
                Clear All Filters
              </Button>
              <Button
                onClick={() => setShowFilters(false)}
                variant="outline"
                size="sm"
              >
                Hide Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Form Entry
          </TabsTrigger>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            Data Table ({filteredEntries.length})
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
                All Entries ({filteredEntries.length} of {formEntries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Loading entries...</span>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No entries found</p>
                    <p className="text-gray-400 text-sm">
                      {formEntries.length === 0 
                        ? 'Create your first entry using the form above'
                        : 'Try adjusting your filters to see more results'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <DataGrid
                  data={filteredEntries}
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
                  <div><span className="font-medium">TAT Status:</span> 
                    {selectedEntry.is_out_of_tat ? 'Out of TAT' : 'Within TAT'}
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