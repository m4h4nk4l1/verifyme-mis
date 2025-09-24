'use client'

import React, { useState, useEffect } from 'react'
import { AdminLayout } from '@/components/dashboard/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FieldEditor } from '@/components/forms/FieldEditor'
import { 
  FileText, 
  Plus, 
  Search, 
  Eye,
  Edit,
  Trash2,
  Building2,
  Calendar,
  User,
  Settings,
  Clock
} from 'lucide-react'
import { FormSchema, Organization, FormEntry } from '@/types/api'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'

interface CreateFormSchemaData {
  name: string
  description: string
  organization: string
  max_fields: number
  tat_hours_limit: number
  is_active: boolean
  fields_definition: any[]
}

export default function FormsPage() {
  const [formSchemas, setFormSchemas] = useState<FormSchema[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterOrganization, setFilterOrganization] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedSchema, setSelectedSchema] = useState<FormSchema | null>(null)
  const [editingSchema, setEditingSchema] = useState<FormSchema | null>(null)

  // Form entries state
  const [formEntries, setFormEntries] = useState<FormEntry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalEntries, setTotalEntries] = useState(0)
  const [filterOutOfTat, setFilterOutOfTat] = useState(false)
  const pageSize = 10

  // Form states
  const [schemaFormData, setSchemaFormData] = useState<CreateFormSchemaData>({
    name: '',
    description: '',
    organization: '',
    max_fields: 120,
    tat_hours_limit: 24,
    is_active: true,
    fields_definition: []
  })

  useEffect(() => {
    fetchFormSchemas()
    fetchOrganizations()
  }, [])

  useEffect(() => {
    fetchFormEntries()
  }, [currentPage, filterOutOfTat, filterOrganization])

  const fetchFormSchemas = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getFormSchemas()
      setFormSchemas(response.results)
    } catch (error) {
      console.error('Error fetching form schemas:', error)
      toast.error('Failed to fetch form schemas')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrganizations = async () => {
    try {
      const response = await apiClient.getOrganizations()
      setOrganizations(response.results)
    } catch (error) {
      console.error('Error fetching organizations:', error)
    }
  }

  const fetchFormEntries = async () => {
    try {
      setEntriesLoading(true)
      const filters: any = {
        page: currentPage,
        page_size: pageSize
      }
      
      if (filterOutOfTat) {
        filters.isOutOfTat = true
      }
      
      if (filterOrganization !== 'all') {
        filters.organization = filterOrganization
      }
      
      const response = await apiClient.getFormEntries(filters)
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

  const handleCreateFormSchema = async () => {
    try {
      await apiClient.createFormSchema(schemaFormData as Record<string, unknown>)
      toast.success('Form schema created successfully')
      setShowCreateDialog(false)
      setSchemaFormData({
        name: '',
        description: '',
        organization: '',
        max_fields: 120,
        tat_hours_limit: 24, // Default TAT limit
        is_active: true,
        fields_definition: []
      })
      fetchFormSchemas()
    } catch (error) {
      console.error('Error creating form schema:', error)
      toast.error('Failed to create form schema')
    }
  }

  const handleUpdateFormSchema = async () => {
    if (!editingSchema) return

    try {
      // Compute simple operations: compare original vs edited
      const original = (editingSchema.fields_definition || []) as any[]
      const edited = (schemaFormData.fields_definition || []) as any[]

      const origByName = new Map(original.map(f => [f.name, f]))
      const editByName = new Map(edited.map(f => [f.name, f]))

      const operations: any[] = []

      // Add new fields
      for (const f of edited) {
        if (!origByName.has(f.name)) {
          operations.push({ op: 'add', field: f })
        }
      }

      // Deprecate removed fields
      for (const f of original) {
        if (!editByName.has(f.name)) {
          operations.push({ op: 'deprecate', name: f.name })
        }
      }

      // Reorder (active fields only)
      const order = edited.filter(f => f.is_active !== false).map(f => f.name)
      if (order.length > 0) {
        operations.push({ op: 'reorder', order })
      }

      // Update changed props (basic check)
      for (const f of edited) {
        const prev = origByName.get(f.name)
        if (prev) {
          const changes: any = {}
          for (const key of ['display_name','field_type','is_required','is_unique','default_value','help_text','validation_rules','is_active']) {
            if (JSON.stringify(prev[key]) !== JSON.stringify(f[key])) {
              changes[key] = f[key]
            }
          }
          if (Object.keys(changes).length) {
            operations.push({ op: 'update', name: f.name, changes })
          }
        }
      }

      const expected_version = (editingSchema as any).version || 1
      await apiClient.mutateFormSchema(editingSchema.id, { expected_version, operations })

      toast.success('Form schema updated successfully')
      setEditingSchema(null)
      setSchemaFormData({
        name: '',
        description: '',
        organization: '',
        max_fields: 120,
        tat_hours_limit: 24, // Default TAT limit
        is_active: true,
        fields_definition: []
      })
      fetchFormSchemas()
    } catch (error) {
      console.error('Error updating form schema:', error)
      toast.error('Failed to update form schema')
    }
  }

  const handleDeleteFormSchema = async (schema: FormSchema) => {
    if (!confirm(`Are you sure you want to delete "${schema.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      await apiClient.deleteFormSchema(schema.id)
      toast.success('Form schema deleted successfully')
      fetchFormSchemas()
    } catch (error) {
      console.error('Error deleting form schema:', error)
      toast.error('Failed to delete form schema')
    }
  }

  const handleViewSchema = (schema: FormSchema) => {
    setSelectedSchema(schema)
  }

  const handleEditSchema = (schema: FormSchema) => {
    setEditingSchema(schema)
    setSchemaFormData({
      name: schema.name,
      description: schema.description,
      organization: schema.organization,
      max_fields: schema.max_fields,
      tat_hours_limit: schema.tat_hours_limit || 24, // Default TAT limit
      is_active: schema.is_active,
      fields_definition: schema.fields_definition || []
    })
  }

  const handleFieldsChange = (fields: any[]) => {
    setSchemaFormData(prev => ({
      ...prev,
      fields_definition: fields
    }))
  }

  const handleEntrySelect = (entry: FormEntry) => {
    // You can implement a modal or navigation to show entry details
  }

  const handleEntryEdit = (entry: FormEntry) => {
    // Navigate to edit page or open edit modal
  }

  const filteredSchemas = formSchemas.filter(schema => {
    const matchesSearch = schema.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schema.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesOrganization = filterOrganization === 'all' || schema.organization === filterOrganization
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && schema.is_active) ||
                         (filterStatus === 'inactive' && !schema.is_active)

    return matchesSearch && matchesOrganization && matchesStatus
  })

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const getOrganizationName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    return org ? org.display_name : 'Unknown Organization'
  }

  const getStatusBadge = (entry: FormEntry) => {
    if (entry.is_verified) {
      return <Badge className="bg-green-100 text-green-800">Verified</Badge>
    } else if (entry.is_completed) {
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

  return (
    <AdminLayout currentPage="Forms">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Form Management</h1>
            <p className="text-gray-600">Create and manage dynamic form schemas across organizations</p>
          </div>
        </div>

        <Tabs defaultValue="schemas" className="space-y-6">
          <TabsList>
            <TabsTrigger value="schemas">Form Schemas</TabsTrigger>
            <TabsTrigger value="entries">Form Entries</TabsTrigger>
          </TabsList>

          <TabsContent value="schemas" className="space-y-6">
            {/* Form Schemas Content */}
            <div className="flex justify-end">
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Form Schema
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Form Schema</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Form Name</Label>
                      <Input
                        id="name"
                        value={schemaFormData.name}
                        onChange={(e) => setSchemaFormData({...schemaFormData, name: e.target.value})}
                        placeholder="Enter form name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={schemaFormData.description}
                        onChange={(e) => setSchemaFormData({...schemaFormData, description: e.target.value})}
                        placeholder="Enter form description"
                      />
                    </div>

                    <div>
                      <Label htmlFor="organization">Organization</Label>
                      <Select 
                        value={schemaFormData.organization} 
                        onChange={(e) => setSchemaFormData({...schemaFormData, organization: e.target.value})}
                      >
                        <option value="">Select Organization</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>{org.display_name}</option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="max_fields">Maximum Fields</Label>
                      <Input
                        id="max_fields"
                        type="number"
                        value={schemaFormData.max_fields}
                        onChange={(e) => setSchemaFormData({...schemaFormData, max_fields: parseInt(e.target.value)})}
                        placeholder="120"
                        min="1"
                        max="120"
                      />
                    </div>

                    <div>
                      <Label htmlFor="tat_hours_limit">TAT Hours Limit</Label>
                      <Input
                        id="tat_hours_limit"
                        type="number"
                        value={schemaFormData.tat_hours_limit}
                        onChange={(e) => setSchemaFormData({...schemaFormData, tat_hours_limit: parseInt(e.target.value)})}
                        placeholder="24"
                        min="1"
                        max="720"
                      />
                      <p className="text-xs text-gray-500 mt-1">Time limit in hours for form completion</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={schemaFormData.is_active}
                        onChange={(e) => setSchemaFormData({...schemaFormData, is_active: e.target.checked})}
                        className="rounded"
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateFormSchema}>
                        Create Schema
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search forms..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={filterOrganization} onChange={(e) => setFilterOrganization(e.target.value)}>
                    <option value="all">All Organizations</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.display_name}</option>
                    ))}
                  </Select>

                  <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Form Schemas List */}
            <Card>
              <CardHeader>
                <CardTitle>Form Schemas ({filteredSchemas.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">Loading form schemas...</div>
                  </div>
                ) : filteredSchemas.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No form schemas found</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredSchemas.map((schema) => (
                      <div key={schema.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                <FileText className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold">{schema.name}</h3>
                                <p className="text-sm text-gray-600">{schema.description}</p>
                              </div>
                              <Badge className={getStatusColor(schema.is_active)}>
                                {schema.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                <span>{getOrganizationName(schema.organization)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Settings className="h-4 w-4" />
                                <span>{schema.fields_definition?.length || 0} fields</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>Created {formatDate(schema.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>Max: {schema.max_fields}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>TAT: {schema.tat_hours_limit}h</span>
                              </div>
                            </div>

                            {schema.fields_definition && schema.fields_definition.length > 0 && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-600 mb-1">Fields:</p>
                                <div className="flex flex-wrap gap-1">
                                  {schema.fields_definition.slice(0, 5).map((field, index) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {field.display_name}
                                    </Badge>
                                  ))}
                                  {schema.fields_definition.length > 5 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{schema.fields_definition.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewSchema(schema)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditSchema(schema)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteFormSchema(schema)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schema Details Dialog */}
            <Dialog open={!!selectedSchema} onOpenChange={() => setSelectedSchema(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Form Schema Details</DialogTitle>
                </DialogHeader>
                
                {selectedSchema && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{selectedSchema.name}</h3>
                        <p className="text-sm text-gray-600">{selectedSchema.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium">Organization:</span>
                        <p>{getOrganizationName(selectedSchema.organization)}</p>
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <Badge className={getStatusColor(selectedSchema.is_active)}>
                          {selectedSchema.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Max Fields:</span>
                        <p>{selectedSchema.max_fields}</p>
                      </div>
                      <div>
                        <span className="font-medium">TAT Limit:</span>
                        <p>{selectedSchema.tat_hours_limit || 'N/A'} hours</p>
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>
                        <p>{formatDate(selectedSchema.created_at)}</p>
                      </div>
                    </div>

                    {selectedSchema.fields_definition && selectedSchema.fields_definition.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Fields ({selectedSchema.fields_definition.length})</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {selectedSchema.fields_definition.map((field, index) => (
                            <div key={index} className="border rounded p-2">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{field.display_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {field.field_type}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                <span>Required: {field.is_required ? 'Yes' : 'No'}</span>
                                {field.help_text && (
                                  <span className="ml-2">• {field.help_text}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Edit Schema Dialog */}
            <Dialog open={!!editingSchema} onOpenChange={() => setEditingSchema(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Form Schema: {editingSchema?.name}</DialogTitle>
                </DialogHeader>
                
                {editingSchema && (
                  <>
                    <Tabs defaultValue="fields" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="fields">Fields</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                      </TabsList>

                      <TabsContent value="fields" className="space-y-4">
                        <FieldEditor
                          fields={schemaFormData.fields_definition}
                          onFieldsChange={handleFieldsChange}
                          maxFields={schemaFormData.max_fields}
                          isExistingSchema={!!editingSchema?.id}
                        />
                      </TabsContent>

                      <TabsContent value="settings" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-name">Form Name</Label>
                            <Input
                              id="edit-name"
                              value={schemaFormData.name}
                              onChange={(e) => setSchemaFormData({...schemaFormData, name: e.target.value})}
                            />
                          </div>

                          <div>
                            <Label htmlFor="edit-description">Description</Label>
                            <Input
                              id="edit-description"
                              value={schemaFormData.description}
                              onChange={(e) => setSchemaFormData({...schemaFormData, description: e.target.value})}
                            />
                          </div>

                          <div>
                            <Label htmlFor="edit-max-fields">Maximum Fields</Label>
                            <Input
                              id="edit-max-fields"
                              type="number"
                              value={schemaFormData.max_fields}
                              onChange={(e) => setSchemaFormData({...schemaFormData, max_fields: parseInt(e.target.value)})}
                              min="1"
                              max="120"
                            />
                          </div>

                          <div>
                            <Label htmlFor="edit-tat-hours-limit">TAT Hours Limit</Label>
                            <Input
                              id="edit-tat-hours-limit"
                              type="number"
                              value={schemaFormData.tat_hours_limit}
                              onChange={(e) => setSchemaFormData({...schemaFormData, tat_hours_limit: parseInt(e.target.value)})}
                              min="1"
                              max="168"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="edit-is-active"
                              checked={schemaFormData.is_active}
                              onChange={(e) => setSchemaFormData({...schemaFormData, is_active: e.target.checked})}
                              className="rounded"
                            />
                            <Label htmlFor="edit-is-active">Active</Label>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setEditingSchema(null)}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateFormSchema}>
                        Update Schema
                      </Button>
                    </div>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="entries" className="space-y-6">
            {/* Form Entries Content */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Form Entries
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search entries..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={filterOrganization} onChange={(e) => setFilterOrganization(e.target.value)}>
                    <option value="all">All Organizations</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.display_name}</option>
                    ))}
                  </Select>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="out_of_tat"
                      checked={filterOutOfTat}
                      onChange={(e) => setFilterOutOfTat(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="out_of_tat">Show Out of TAT Only</Label>
                  </div>
                </div>

                {/* Form Entries Table */}
                {entriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">Loading form entries...</div>
                  </div>
                ) : formEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No form entries found</p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Employee</TableHead>
                          <TableHead>Form Schema</TableHead>
                          <TableHead>TAT Status</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formEntries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              {getStatusBadge(entry)}
                            </TableCell>
                            <TableCell>
                              {entry.employee?.first_name} {entry.employee?.last_name}
                            </TableCell>
                            <TableCell>
                              {entry.form_schema || 'N/A'}
                            </TableCell>
                            <TableCell>
                              {getTatStatus(entry)}
                            </TableCell>
                            <TableCell>
                              {formatDate(entry.created_at)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEntrySelect(entry)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEntryEdit(entry)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious 
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                            
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(page)}
                                    isActive={currentPage === page}
                                    className="cursor-pointer"
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              )
                            })}
                            
                            <PaginationItem>
                              <PaginationNext 
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}

                    <div className="mt-4 text-sm text-gray-600">
                      Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalEntries)} of {totalEntries} entries
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
