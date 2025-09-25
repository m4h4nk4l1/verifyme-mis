'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/dashboard/AdminLayout'
import { EmployeeManagement } from '@/components/admin/EmployeeManagement'
import { FormBuilder } from '@/components/forms/FormBuilder'
import { EmployeeAnalytics } from '@/components/dashboard/EmployeeAnalytics'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Users, 
  Building2,
  Globe,
  BarChart3,
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Filter, 
  Eye,
  Edit,
  Trash2,
  X,
  User, 
  File,
  Image,
  Info,
  UserCheck,
  Upload
} from 'lucide-react'
import { FormEntry, FormEntryStatistics, OrganizationStatistics, FormSchema, FormField } from '@/types/api'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AdvancedFilters, FormEntryFilters } from '@/components/forms/AdvancedFilters'

export default function AdminDashboard() {
  // State management
  const [activeTab, setActiveTab] = useState('overview')
  const [formStatistics, setFormStatistics] = useState<FormEntryStatistics | null>(null)
  const [orgStatistics, setOrgStatistics] = useState<OrganizationStatistics | null>(null)
  const [formEntries, setFormEntries] = useState<FormEntry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalEntries, setTotalEntries] = useState(0)
  const [statsLoading, setStatsLoading] = useState(false)
  
  // Modal states
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<FormEntry | null>(null)
  const [selectedSchema, setSelectedSchema] = useState<FormSchema | null>(null)
  const [editFormData, setEditFormData] = useState<Record<string, unknown>>({})
  const [editLoading, setEditLoading] = useState(false)
  const [fileInfo, setFileInfo] = useState<Record<string, unknown>>({})
  const [failedFileIds, setFailedFileIds] = useState<Set<string>>(new Set())

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false)
  const [showFormFields, setShowFormFields] = useState(true)
  const [advancedFilters, setAdvancedFilters] = useState<FormEntryFilters>({})
  
  const { user } = useAuth()
  const router = useRouter()

  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const pageSize = 20

  useEffect(() => {
    fetchStatistics()
    fetchFormEntries()
  }, [])

  useEffect(() => {
    fetchFormEntries()
  }, [currentPage, advancedFilters])

  const fetchStatistics = async () => {
    try {
      setStatsLoading(true)
      
      // Fetch form entry statistics
      const formStats = await apiClient.getFormEntryStatistics()
      setFormStatistics(formStats)
      
      // Fetch organization statistics for super admin
      if (isSuperAdmin) {
        const orgStats = await apiClient.getOrganizationStatistics()
        setOrgStatistics(orgStats)
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
      toast.error('Failed to load statistics')
    } finally {
      setStatsLoading(false)
    }
  }

  const refreshStatistics = async () => {
    await fetchStatistics()
    toast.success('Statistics refreshed successfully')
  }

  const fetchFormEntries = async () => {
    try {
      setEntriesLoading(true)
      
      // Always use advanced filtering endpoint for consistency and proper pagination
      const apiFilters: Record<string, unknown> = {}
      
      // Convert advanced filters to API format
      if (advancedFilters.dateRange) apiFilters.date_range = advancedFilters.dateRange
      if (advancedFilters.status) apiFilters.status = advancedFilters.status
      if (advancedFilters.startDate) apiFilters.start_date = advancedFilters.startDate
      if (advancedFilters.endDate) apiFilters.end_date = advancedFilters.endDate
      if (advancedFilters.employee) apiFilters.employee_name = advancedFilters.employee
      if (advancedFilters.bankNbfc) apiFilters.bank_nbfc_name = advancedFilters.bankNbfc
      if (advancedFilters.location) apiFilters.location = advancedFilters.location
      if (advancedFilters.productType) apiFilters.product_type = advancedFilters.productType
      if (advancedFilters.caseStatus) apiFilters.case_status = advancedFilters.caseStatus
      if (advancedFilters.isRepeatCase !== undefined) apiFilters.is_repeat_case = advancedFilters.isRepeatCase
      if (advancedFilters.isOutOfTat !== undefined) apiFilters.is_out_of_tat = advancedFilters.isOutOfTat
      if (advancedFilters.fieldVerifier) apiFilters.field_verifier_name = advancedFilters.fieldVerifier
      if (advancedFilters.backOfficeExecutive) apiFilters.back_office_executive_name = advancedFilters.backOfficeExecutive
      if (advancedFilters.search) apiFilters.search = advancedFilters.search
      
      // Add pagination parameters to the request body
      apiFilters.page = currentPage
      apiFilters.page_size = pageSize
      
      console.log('API filters being sent:', apiFilters)
      const response = await apiClient.advancedFilterEntries(apiFilters)
      
      setFormEntries(response.results || response || [])
      setTotalEntries(response.count || (response.results || response || []).length)
      setTotalPages(Math.ceil((response.count || (response.results || response || []).length) / pageSize))
    } catch (error) {
      console.error('Error fetching form entries:', error)
      toast.error('Failed to load form entries')
    } finally {
      setEntriesLoading(false)
    }
  }

  const handleEntrySelect = async (entry: FormEntry) => {
    try {
      const response = await apiClient.viewEntryDetails(entry.id);
      setSelectedSchema(response.schema);
      setSelectedEntry(entry);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching form schema:', error);
      toast.error('Failed to load form details');
    }
  };

  const handleEntryEdit = async (entry: FormEntry) => {
    try {
      const response = await apiClient.viewEntryDetails(entry.id);
      setSelectedSchema(response.schema);
      setSelectedEntry(entry);
      setEditFormData(entry.form_data || {});
      setShowEditModal(true);
    } catch (error) {
      console.error('Error fetching form schema:', error);
      toast.error('Failed to load form details');
    }
  };

  const handleEntryDelete = async (entry: FormEntry) => {
    if (confirm('Are you sure you want to delete this entry?')) {
      try {
        await apiClient.deleteFormEntry(entry.id)
        toast.success('Entry deleted successfully')
        fetchFormEntries()
      } catch (error) {
        console.error('Error deleting entry:', error)
        toast.error('Failed to delete entry')
      }
    }
  }

  const handleEntryComplete = async (entry: FormEntry) => {
    try {
      await apiClient.completeFormEntry(entry.id)
      toast.success('Entry completed successfully')
      fetchFormEntries()
    } catch (error) {
      console.error('Error completing entry:', error)
      toast.error('Failed to complete entry')
    }
  }

  const handleNavigateToOrganizations = () => {
    router.push('/admin/organizations')
  }

  const handleNavigateToUsers = () => {
    router.push('/admin/employees')
  }

  const handleNavigateToForms = () => {
    router.push('/admin/forms')
  }

  const handleSaveEdit = async () => {
    if (!selectedEntry) return

    try {
      setEditLoading(true)
      
      // Handle file uploads first
      const updatedFormData = { ...editFormData }
      
      // Ensure fields_definition is typed as FormField[]
      const fields: FormField[] = selectedSchema?.fields_definition || [];
      
      for (const [fieldName, value] of Object.entries(editFormData)) {
        const field = fields.find((f) => f.name === fieldName)
        
        if (field && (field.field_type === 'IMAGE_UPLOAD' || field.field_type === 'DOCUMENT_UPLOAD') && value instanceof File) {
          try {
            // Upload the file
            const uploadedFile = await apiClient.uploadFormFieldFile(
              selectedEntry.id,
              fieldName,
              value as File,
              `Uploaded for ${field.display_name}`
            )
            updatedFormData[fieldName] = uploadedFile.id
          } catch (uploadError) {
            console.error('Error uploading file:', uploadError)
            toast.error(`Failed to upload ${field.display_name}`)
            return
          }
        }
      }
      
      // Update the form entry
      await apiClient.updateFormEntry(selectedEntry.id, {
        form_data: updatedFormData
      })
      
      toast.success('Entry updated successfully')
      setShowEditModal(false)
      setSelectedEntry(null)
      setSelectedSchema(null)
      setEditFormData({})
      fetchFormEntries()
    } catch (error) {
      console.error('Error updating entry:', error)
      toast.error('Failed to update entry')
    } finally {
      setEditLoading(false)
    }
  }

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setEditFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  // Handle advanced filter changes
  const handleAdvancedFiltersChange = (newFilters: FormEntryFilters) => {
    setAdvancedFilters(newFilters)
    
    // Reset to first page when filters change
    setCurrentPage(1)
    
    // Convert advanced filters to API format
    const apiFilters: Record<string, unknown> = {}
    
    if (newFilters.dateRange) apiFilters.date_range = newFilters.dateRange
    if (newFilters.startDate) apiFilters.start_date = newFilters.startDate
    if (newFilters.endDate) apiFilters.end_date = newFilters.endDate
    if (newFilters.month) apiFilters.month = newFilters.month
    if (newFilters.year) apiFilters.year = newFilters.year
    if (newFilters.bankNbfc) apiFilters.bank_nbfc_name = newFilters.bankNbfc
    if (newFilters.location) apiFilters.location = newFilters.location
    if (newFilters.productType) apiFilters.product_type = newFilters.productType
    if (newFilters.caseStatus) apiFilters.case_status = newFilters.caseStatus
    if (newFilters.isRepeatCase !== undefined) apiFilters.is_repeat_case = newFilters.isRepeatCase
    if (newFilters.isOutOfTat !== undefined) apiFilters.is_out_of_tat = newFilters.isOutOfTat
    if (newFilters.fieldVerifier) apiFilters.field_verifier_name = newFilters.fieldVerifier
    if (newFilters.backOfficeExecutive) apiFilters.back_office_executive_name = newFilters.backOfficeExecutive
    if (newFilters.search) apiFilters.search = newFilters.search
    if (newFilters.employee) apiFilters.employee_name = newFilters.employee
    if (newFilters.status) apiFilters.status = newFilters.status
    
    console.log('Advanced filters changed:', apiFilters)
  }



  const getStatusBadge = (entry: FormEntry) => {
    // Use the status field from backend if available, otherwise calculate from flags
    const status = entry.status || (entry.is_verified ? 'verified' : entry.is_completed ? 'completed' : 'pending');
    
    if (status === 'verified') {
      return <Badge className="bg-green-100 text-green-800">Verified</Badge>
    } else if (status === 'completed') {
      return <Badge className="bg-yellow-100 text-yellow-800">Completed</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">Pending</Badge>
    }
  }

  const getTatStatus = (entry: FormEntry) => {
    if (entry.is_out_of_tat) {
      return <Badge className="bg-red-100 text-red-800">Out of TAT</Badge>
    }
    return <Badge className="bg-green-100 text-green-800">Within TAT</Badge>
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

  // Fetch file information for a file ID
  const fetchFileInfo = async (fileId: string) => {
    // Skip if fileId is not a valid UUID format
    if (!fileId || typeof fileId !== 'string' || fileId.length !== 36) {
      console.warn('Invalid file ID format:', fileId);
      return null;
    }
    
    // Check if we've already tried to fetch this file and failed
    if (failedFileIds.has(fileId)) {
      return null;
    }
    
    // Check if already cached
    if (fileInfo[fileId]) return fileInfo[fileId];
    
    try {
      const fileData = await apiClient.getFormFieldFile(fileId);
      if (fileData && fileData.file_url) {
        setFileInfo(prev => ({ ...prev, [fileId]: fileData }));
        return fileData;
      } else {
        console.warn('File data missing or invalid for ID:', fileId);
        setFailedFileIds(prev => new Set([...prev, fileId]));
        return null;
      }
    } catch (error) {
      console.warn('Failed to fetch file info for ID:', fileId, error);
      setFailedFileIds(prev => new Set([...prev, fileId]));
    return null;
    }
  }

  // Replace the getFieldValue function with the robust version from EmployeeDashboard
  const getFieldValue = (entry: FormEntry, fieldName: string) => {
    const dataToUse = entry.filtered_form_data || entry.form_data;
    const value = dataToUse?.[fieldName];

    if (value === undefined || value === null) return 'N/A';

    // Handle file fields - check if it's a file ID (UUID format)
    if (typeof value === 'string' && value.length === 36 && value.includes('-')) {
        const file = fileInfo[value];
      if (file && typeof file === 'object' && 'file_url' in file) {
          return (
            <a 
            href={(file as { file_url: string }).file_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
            📎 {(file as { original_filename?: string }).original_filename || 'View File'}
            </a>
          );
        } else {
          fetchFileInfo(value);
          return '📎 Loading...';
        }
      }
      
    // Handle S3 URLs directly
    if (typeof value === 'string' && value.startsWith('http')) {
      if (value.includes('s3.amazonaws.com') || 
          value.includes('verifyme-mis-files') ||
          value.includes('amazonaws.com')) {
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            📎 View File
          </a>
        );
      }
      return value;
    }

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number') {
        return value.toString();
      }

    if (typeof value === 'object') {
      if (value && typeof value === 'object' && 'file_url' in value) {
        return (
          <a 
            href={(value as { file_url: string }).file_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            📎 {(value as { original_filename?: string }).original_filename || 'View File'}
          </a>
        );
      }
      return JSON.stringify(value);
    }

    return String(value);
  }

  // Get all unique field names across all schemas
  const getAllFieldNames = () => {
    const fieldObjects: Array<{
      name: string
      field_type: string
      options?: string[]
    }> = [];
    
    formEntries.forEach(entry => {
      if (entry.form_schema_details && entry.form_schema_details.fields_definition) {
        entry.form_schema_details.fields_definition.forEach((field: { 
          name: string
          field_type: string
          options?: string[]
        }) => {
          // Check if we already have this field
          const existingField = fieldObjects.find(f => f.name === field.name)
          if (!existingField) {
            fieldObjects.push({
              name: field.name,
              field_type: field.field_type,
              options: field.options
            });
          }
        });
      }
    });
    
    const result = fieldObjects.sort((a, b) => a.name.localeCompare(b.name));
    console.log('🔍 Extracted field objects:', result);
    return result;
  };

  return (
    <AdminLayout 
      currentPage="Admin Dashboard"
      showTabs={true}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsContent value="overview" className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-xl p-8 text-white shadow-2xl">
            <h1 className="text-4xl font-bold mb-4">
              Welcome back, {user?.first_name} {user?.last_name}! 👋
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              {isSuperAdmin 
                ? 'You have full administrative access to manage all organizations, users, and form data across the platform.'
                : 'Manage your organization\'s forms, employees, and data with comprehensive analytics and filtering capabilities.'
              }
            </p>
          </div>

          {/* Super Admin Overview Cards */}
          {isSuperAdmin && orgStatistics && (
            <div className="space-y-6">
              {/* Organization Statistics Header with Refresh Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-bold text-gray-800">Organization Statistics</h3>
                  <p className="text-lg text-gray-600 mt-2">Real-time organization data and analytics</p>
                </div>
                <Button
                  onClick={refreshStatistics}
                  variant="outline"
                  size="lg"
                  disabled={statsLoading}
                  className="bg-white hover:bg-gray-50 border-2 border-gray-200 text-lg font-semibold px-6 py-3"
                >
                  <RefreshCw className={`h-6 w-6 mr-3 ${statsLoading ? 'animate-spin' : ''}`} />
                  Refresh Statistics
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-xl font-bold text-blue-900">Total Organizations</CardTitle>
                    <Building2 className="h-8 w-8 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-900">
                      {statsLoading ? '...' : orgStatistics.total_organizations}
                    </div>
                    <p className="text-sm text-blue-700 font-medium">All organizations</p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-xl font-bold text-green-900">Active Organizations</CardTitle>
                    <UserCheck className="h-8 w-8 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-900">
                      {statsLoading ? '...' : orgStatistics.active_organizations}
                    </div>
                    <p className="text-sm text-green-700 font-medium">Currently active</p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-gradient-to-br from-indigo-50 to-indigo-100 hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-xl font-bold text-indigo-900">Banks</CardTitle>
                    <Globe className="h-8 w-8 text-indigo-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-indigo-900">
                      {statsLoading ? '...' : orgStatistics.business_type_breakdown.find(b => b.business_type === 'BANK')?.count || 0}
                    </div>
                    <p className="text-sm text-indigo-700 font-medium">Bank organizations</p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-xl font-bold text-emerald-900">NBFCs</CardTitle>
                    <BarChart3 className="h-8 w-8 text-emerald-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-900">
                      {statsLoading ? '...' : orgStatistics.business_type_breakdown.find(b => b.business_type === 'NBFC')?.count || 0}
                    </div>
                    <p className="text-sm text-emerald-700 font-medium">NBFC organizations</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Form Entry Statistics Cards */}
          {formStatistics && (
            <div className="space-y-6">
              {/* Statistics Header with Refresh Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-bold text-gray-800">Form Entry Analytics</h3>
                  <p className="text-lg text-gray-600 mt-2">Comprehensive form submission statistics and insights</p>
                </div>
                <Button
                  onClick={refreshStatistics}
                  variant="outline"
                  size="lg"
                  disabled={statsLoading}
                  className="bg-white hover:bg-gray-50 border-2 border-gray-200 text-lg font-semibold px-6 py-3"
                >
                  <RefreshCw className={`h-6 w-6 mr-3 ${statsLoading ? 'animate-spin' : ''}`} />
                  Refresh Analytics
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-xl font-bold text-purple-900">Total Entries</CardTitle>
                    <FileText className="h-8 w-8 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-900">
                      {statsLoading ? '...' : formStatistics.total_entries}
                    </div>
                    <p className="text-sm text-purple-700 font-medium">All form submissions</p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-gradient-to-br from-yellow-50 to-yellow-100 hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-xl font-bold text-yellow-900">Completed</CardTitle>
                    <CheckCircle className="h-8 w-8 text-yellow-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-yellow-900">
                      {statsLoading ? '...' : formStatistics.completed_entries}
                    </div>
                    <p className="text-sm text-yellow-700 font-medium">Successfully completed</p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-gradient-to-br from-red-50 to-red-100 hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-xl font-bold text-red-900">Out of TAT</CardTitle>
                    <Clock className="h-8 w-8 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-900">
                      {statsLoading ? '...' : formStatistics.out_of_tat_entries}
                    </div>
                    <p className="text-sm text-red-700 font-medium">Exceeded time limit</p>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-xl transition-shadow duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-xl font-bold text-orange-900">Repeat Cases</CardTitle>
                    <RefreshCw className="h-8 w-8 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-900">
                      {statsLoading ? '...' : formStatistics.repeat_cases}
                    </div>
                    <p className="text-sm text-orange-700 font-medium">Duplicate submissions</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Quick Actions for Super Admin */}
          {isSuperAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={handleNavigateToOrganizations}
                    className="flex items-center gap-2 h-auto p-4"
                    variant="outline"
                  >
                    <Building2 className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-semibold">Manage Organizations</div>
                      <div className="text-sm text-gray-500">Create and manage organizations</div>
                    </div>
                  </Button>

                  <Button 
                    onClick={handleNavigateToUsers}
                    className="flex items-center gap-2 h-auto p-4"
                    variant="outline"
                  >
                    <Users className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-semibold">Manage Users</div>
                      <div className="text-sm text-gray-500">View and manage all users</div>
                    </div>
                  </Button>

                  <Button 
                    onClick={handleNavigateToForms}
                    className="flex items-center gap-2 h-auto p-4"
                    variant="outline"
                  >
                    <FileText className="h-6 w-6" />
                    <div className="text-left">
                      <div className="font-semibold">Manage Forms</div>
                      <div className="text-sm text-gray-500">Create and manage form schemas</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Form Entries Table */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold text-white">
                    <FileText className="h-7 w-7" />
                    Form Entries Management
                </CardTitle>
                  <CardDescription className="text-blue-100 text-lg mt-1">
                    View and manage all employee form submissions with detailed field data
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowFormFields(!showFormFields)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <Filter className="h-5 w-5 mr-2" />
                    {showFormFields ? 'Hide' : 'Show'} Form Fields
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowFilters(!showFilters)}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <Filter className="h-5 w-5 mr-2" />
                    Advanced Filters
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={refreshStatistics}
                    disabled={statsLoading}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <RefreshCw className={`h-5 w-5 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
              
              {/* Advanced Filters */}
              {showFilters && (
                <div className="mt-6 bg-white/10 rounded-lg p-4">
                  <AdvancedFilters
                    filters={advancedFilters}
                    onFiltersChange={handleAdvancedFiltersChange}
                    onClearFilters={() => {
                      setAdvancedFilters({})
                      fetchFormEntries()
                    }}
                    isLoading={entriesLoading}
                    schemaFields={getAllFieldNames()}
                    warnings={[]}
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6">
              {entriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Clock className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-xl font-semibold text-gray-700">Loading form entries...</p>
                    <p className="text-gray-500 mt-2">Please wait while we fetch your data</p>
                  </div>
                </div>
              ) : formEntries.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-700 mb-2">No Form Entries Found</h3>
                  <p className="text-lg text-gray-500">There are no form entries matching your current filters.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Info className="h-5 w-5 text-blue-600" />
                          <span className="text-lg font-semibold text-blue-900">
                            💡 Scroll horizontally to view all form fields
                          </span>
                        </div>
                        <div className="text-sm text-blue-700">
                          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalEntries)} of {totalEntries} entries
                        </div>
                      </div>
                    </div>
                    
                    <Table className="min-w-full">
                      <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <TableRow className="border-b-2 border-gray-200">
                          <TableHead className="text-lg font-bold text-gray-800 py-4 px-6">Status</TableHead>
                          <TableHead className="text-lg font-bold text-gray-800 py-4 px-6">Employee</TableHead>
                          <TableHead className="text-lg font-bold text-gray-800 py-4 px-6">Form Schema</TableHead>
                          <TableHead className="text-lg font-bold text-gray-800 py-4 px-6">TAT Status</TableHead>
                          <TableHead className="text-lg font-bold text-gray-800 py-4 px-6">Submitted</TableHead>
                          <TableHead className="text-lg font-bold text-gray-800 py-4 px-6">Entry ID</TableHead>
                          <TableHead className="text-lg font-bold text-gray-800 py-4 px-6">Case ID</TableHead>
                          {/* Dynamic form field columns */}
                          {showFormFields && getAllFieldNames().map((fieldName) => (
                            <TableHead key={fieldName.name} className="min-w-[180px] text-lg font-bold text-gray-800 py-4 px-6">
                              {fieldName.name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </TableHead>
                          ))}
                          <TableHead className="text-lg font-bold text-gray-800 py-4 px-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {formEntries.length === 0 && !entriesLoading ? (
                          <TableRow>
                            <TableCell colSpan={8 + (showFormFields ? getAllFieldNames().length : 0)} className="py-12 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <FileText className="h-12 w-12 text-gray-400" />
                                <div className="text-lg font-semibold text-gray-600">No entries found</div>
                                <div className="text-sm text-gray-500">
                                  {Object.keys(advancedFilters).some(key => advancedFilters[key as keyof typeof advancedFilters]) 
                                    ? 'Try adjusting your filters to see more results'
                                    : 'No form entries have been created yet'
                                  }
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          formEntries.map((entry, index) => (
                          <TableRow 
                            key={entry.id} 
                            className={`border-b border-gray-100 hover:bg-blue-50 transition-colors duration-200 ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                          >
                            <TableCell className="py-4 px-6">
                            {getStatusBadge(entry)}
                          </TableCell>
                            <TableCell className="py-4 px-6">
                              <div className="font-semibold text-gray-900">
                            {entry.employee?.first_name} {entry.employee?.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {entry.employee?.email}
                              </div>
                          </TableCell>
                            <TableCell className="py-4 px-6">
                              <div className="font-semibold text-gray-900">
                                {entry.form_schema_details?.name || entry.form_schema || 'N/A'}
                              </div>
                          </TableCell>
                            <TableCell className="py-4 px-6">
                            {getTatStatus(entry)}
                          </TableCell>
                            <TableCell className="py-4 px-6">
                              <div className="font-semibold text-gray-900">
                            {formatDate(entry.created_at)}
                              </div>
                          </TableCell>
                            <TableCell className="py-4 px-6">
                              <div className="font-semibold text-gray-900">
                                {entry.entry_id || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                              <div className="font-semibold text-gray-900">
                                {entry.case_id || 'N/A'}
                              </div>
                            </TableCell>
                            {/* Dynamic form field values */}
                            {showFormFields && getAllFieldNames().map((fieldName) => (
                              <TableCell key={fieldName.name} className="max-w-[200px] py-4 px-6">
                                <div className="truncate font-medium text-gray-700" title={getFieldValue(entry, fieldName.name) as string}>
                                  {getFieldValue(entry, fieldName.name)}
                                </div>
                              </TableCell>
                            ))}
                            <TableCell className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEntrySelect(entry)}
                                  className="hover:bg-blue-100 text-blue-600"
                                  title="View Details"
                              >
                                  <Eye className="h-5 w-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEntryEdit(entry)}
                                  className="hover:bg-yellow-100 text-yellow-600"
                                  title="Edit Entry"
                              >
                                  <Edit className="h-5 w-5" />
                              </Button>
                              {!entry.is_completed && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEntryComplete(entry)}
                                    className="hover:bg-green-100 text-green-600"
                                    title="Mark Complete"
                                >
                                    <CheckCircle className="h-5 w-5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEntryDelete(entry)}
                                  className="hover:bg-red-100 text-red-600"
                                  title="Delete Entry"
                              >
                                  <Trash2 className="h-5 w-5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        )))}
                    </TableBody>
                  </Table>
                  </div>

                  {/* Pagination - Moved to bottom */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-between">
                      <div className="text-lg font-semibold text-gray-700">
                        {entriesLoading ? (
                          <span className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Loading entries...
                          </span>
                        ) : (
                          `Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, totalEntries)} of ${totalEntries} entries`
                        )}
                      </div>
                      <Pagination>
                        <PaginationContent className="gap-2">
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => !entriesLoading && setCurrentPage(Math.max(1, currentPage - 1))}
                              className={`px-4 py-2 text-lg font-semibold ${
                                currentPage === 1 || entriesLoading
                                  ? 'pointer-events-none opacity-50 bg-gray-100' 
                                  : 'cursor-pointer hover:bg-blue-100'
                              }`}
                            />
                          </PaginationItem>
                          
                          {/* Show page numbers with better logic */}
                          {(() => {
                            const pages = []
                            const maxVisiblePages = 7
                            
                            if (totalPages <= maxVisiblePages) {
                              // Show all pages if total is small
                              for (let i = 1; i <= totalPages; i++) {
                                pages.push(i)
                              }
                            } else {
                              // Show smart pagination for large numbers
                              if (currentPage <= 4) {
                                // Show first 5 pages + ellipsis + last page
                                for (let i = 1; i <= 5; i++) {
                                  pages.push(i)
                                }
                                pages.push('...')
                                pages.push(totalPages)
                              } else if (currentPage >= totalPages - 3) {
                                // Show first page + ellipsis + last 5 pages
                                pages.push(1)
                                pages.push('...')
                                for (let i = totalPages - 4; i <= totalPages; i++) {
                                  pages.push(i)
                                }
                              } else {
                                // Show first page + ellipsis + current-1, current, current+1 + ellipsis + last page
                                pages.push(1)
                                pages.push('...')
                                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                                  pages.push(i)
                                }
                                pages.push('...')
                                pages.push(totalPages)
                              }
                            }
                            
                            return pages.map((page, index) => (
                              <PaginationItem key={index}>
                                {page === '...' ? (
                                  <span className="px-4 py-2 text-lg font-semibold text-gray-500">...</span>
                                ) : (
                                <PaginationLink
                                    onClick={() => !entriesLoading && setCurrentPage(page as number)}
                                  isActive={currentPage === page}
                                    className={`px-4 py-2 text-lg font-semibold ${
                                      entriesLoading 
                                        ? 'pointer-events-none opacity-50' 
                                        : currentPage === page 
                                          ? 'bg-blue-600 text-white' 
                                          : 'cursor-pointer hover:bg-blue-100'
                                    }`}
                                >
                                  {page}
                                </PaginationLink>
                                )}
                              </PaginationItem>
                            ))
                          })()}
                          
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => !entriesLoading && setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              className={`px-4 py-2 text-lg font-semibold ${
                                currentPage === totalPages || entriesLoading
                                  ? 'pointer-events-none opacity-50 bg-gray-100' 
                                  : 'cursor-pointer hover:bg-blue-100'
                              }`}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Employee Activity Logs</h2>
            <p className="text-gray-600 mb-6">
              Real-time employee creation and login/logout activity analytics.
            </p>
            
            {/* Employee Activity Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Employee Activity Analytics
                </CardTitle>
                <CardDescription>
                  Track employee creation and authentication activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmployeeAnalytics />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <EmployeeManagement organizationId={user?.organization} />
        </TabsContent>

        <TabsContent value="forms" className="space-y-6">
          <FormBuilder organizationId={user?.organization} />
        </TabsContent>
      </Tabs>

      {/* View Entry Modal */}
      {showViewModal && selectedEntry && selectedSchema && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">View Form Entry</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowViewModal(false)
                  setSelectedEntry(null)
                  setSelectedSchema(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* Entry Information */}
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
                      {formatDate(selectedEntry.created_at)}
                    </div>
                    <div><span className="font-medium">Employee:</span> 
                      {selectedEntry.employee?.first_name} {selectedEntry.employee?.last_name}
                    </div>
                    <div><span className="font-medium">Form Schema:</span> 
                      {selectedSchema.name}
                    </div>
                    <div><span className="font-medium">Entry ID:</span> {selectedEntry.entry_id !== undefined && selectedEntry.entry_id !== null ? selectedEntry.entry_id : 'N/A'}</div>
                    <div><span className="font-medium">Case ID:</span> {selectedEntry.case_id || 'N/A'}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Form Data</h4>
                  <div className="space-y-2 text-sm">
                    {selectedSchema.fields_definition?.map((field) => (
                      <div key={field.name}>
                        <span className="font-medium">{field.display_name}:</span> 
                        <span className="ml-2">
                          {getFieldValue(selectedEntry, field.name)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Entry Modal */}
      {showEditModal && selectedEntry && selectedSchema && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Form Entry</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEditModal(false)
                  setSelectedEntry(null)
                  setSelectedSchema(null)
                  setEditFormData({})
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* Entry Information */}
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
                      {formatDate(selectedEntry.created_at)}
                    </div>
                    <div><span className="font-medium">Employee:</span> 
                      {selectedEntry.employee?.first_name} {selectedEntry.employee?.last_name}
                    </div>
                    <div><span className="font-medium">Form Schema:</span> 
                      {selectedSchema.name}
                    </div>
                    <div><span className="font-medium">Entry ID:</span> {selectedEntry.entry_id !== undefined && selectedEntry.entry_id !== null ? selectedEntry.entry_id : 'N/A'}</div>
                    <div><span className="font-medium">Case ID:</span> {selectedEntry.case_id || 'N/A'}</div>
                  </div>
                </div>
              </div>
              
              {/* Form Fields */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Edit Form Data</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSchema.fields_definition?.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <label className="text-sm font-medium">
                        {field.display_name}
                        {field.is_required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      
                      {field.field_type === 'IMAGE_UPLOAD' || field.field_type === 'DOCUMENT_UPLOAD' ? (
                        <div className="space-y-3">
                          {/* Show current file if exists */}
                          {editFormData[field.name] && (editFormData[field.name] as unknown as { file_url?: string }) && (
                            <div className="p-3 border border-gray-200 rounded-md bg-gray-50">
                              <div className="flex items-center space-x-2">
                                {field.field_type === 'IMAGE_UPLOAD' ? (
                                  <Image className="h-4 w-4 text-blue-600" />
                                ) : (
                                  <File className="h-4 w-4 text-green-600" />
                                )}
                                <span className="text-sm font-medium">
                                  Current {field.field_type === 'IMAGE_UPLOAD' ? 'Image' : 'Document'}:
                                </span>
                                <span className="text-sm text-gray-600">
                                  {typeof editFormData[field.name] === 'string' 
                                    ? editFormData[field.name] as string
                                    : 'File uploaded'}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* File upload input */}
                          <div className="flex items-center space-x-2">
                            <input
                              type="file"
                              id={`file-${field.name}`}
                              accept={field.field_type === 'IMAGE_UPLOAD' 
                                ? 'image/*' 
                                : '.pdf,.doc,.docx,.txt,.xls,.xlsx'
                              }
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  handleFieldChange(field.name, file)
                                }
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor={`file-${field.name}`}
                              className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50"
                            >
                              <Upload className="h-4 w-4" />
                              <span className="text-sm">
                                Choose {field.field_type === 'IMAGE_UPLOAD' ? 'Image' : 'Document'}
                              </span>
                            </label>
                            {editFormData[field.name] && (editFormData[field.name] as unknown as { file_url?: string }) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleFieldChange(field.name, null)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={String(editFormData[field.name] || '')}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Enter ${field.display_name.toLowerCase()}`}
                        />
                      )}
                      
                      {field.help_text && (
                        <p className="text-xs text-gray-500">{field.help_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedEntry(null)
                    setSelectedSchema(null)
                    setEditFormData({})
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
} 