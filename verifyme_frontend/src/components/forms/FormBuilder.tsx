'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Plus, Edit, Trash2, Eye, FileText, ArrowUp, ArrowDown, Save } from 'lucide-react'
import { FormSchema, FormField } from '@/types/api'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface FormBuilderProps {
  organizationId?: string
}

export function FormBuilder({ organizationId }: FormBuilderProps) {
  const [schemas, setSchemas] = useState<FormSchema[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSchema, setEditingSchema] = useState<FormSchema | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    fetchSchemas()
  }, [organizationId])

  const fetchSchemas = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getFormSchemas(organizationId)
      
      // Handle different response structures
      const schemasData = Array.isArray(response) ? response : response.results || response.schemas || []
      
      setSchemas(schemasData)
    } catch (error) {
      console.error('Error fetching schemas:', error)
      setSchemas([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSchema = async (schemaData: Partial<FormSchema>) => {
    try {
      // Add organization ID to the request data
      const requestData = {
        ...schemaData,
        organization: organizationId || user?.organization
      }
      
      await apiClient.createFormSchema(requestData);
      toast.success('Form schema created successfully!');
      setShowCreateModal(false);
      fetchSchemas();
    } catch (error) {
      console.error('Error creating schema:', error);
      toast.error('Failed to create form schema');
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        response: (error as { response?: { data?: unknown; status?: number } })?.response?.data,
        status: (error as { response?: { data?: unknown; status?: number } })?.response?.status
      })
      alert(`Failed to create form schema: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleUpdateSchema = async (schemaId: string, schemaData: Partial<FormSchema>) => {
    try {
      // Use the new mutate endpoint for field changes
      const original = editingSchema?.fields_definition || []
      const edited = schemaData.fields_definition || []
      
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
      
      // Update changed props
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
      
      if (operations.length > 0) {
        const expected_version = (editingSchema as any)?.version || 1
        await apiClient.mutateFormSchema(schemaId, { expected_version, operations })
      }
      
      setEditingSchema(null)
      fetchSchemas()
    } catch (error) {
      console.error('Error updating schema:', error)
    }
  }

  const handleDeleteSchema = async (schemaId: string) => {
    if (confirm('Are you sure you want to delete this form schema?')) {
      try {
        await apiClient.deleteFormSchema(schemaId)
        fetchSchemas()
      } catch (error) {
        console.error('Error deleting schema:', error)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Form Builder</h2>
          <p className="text-gray-600">Create and manage dynamic form schemas</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Form Schema
        </Button>
      </div>

      {/* Form Schemas Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading form schemas...</div>
        </div>
      ) : schemas.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No form schemas found</p>
              <p className="text-sm text-gray-400 mt-1">Create your first form schema to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schemas.map((schema) => (
            <Card key={schema.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {schema.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingSchema(schema)}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingSchema(schema)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSchema(schema.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">{schema.description}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Fields:</span>
                    <span className="font-medium">{schema.fields_definition.length}/{schema.max_fields}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      schema.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {schema.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Created:</span>
                    <span>{new Date(schema.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Schema Modal */}
      {(showCreateModal || editingSchema) && (
        <SchemaModal
          schema={editingSchema}
          onClose={() => {
            setShowCreateModal(false)
            setEditingSchema(null)
          }}
          onSubmit={editingSchema 
            ? (data) => handleUpdateSchema(editingSchema.id, data)
            : handleCreateSchema
          }
        />
      )}
    </div>
  )
}

interface SchemaModalProps {
  schema?: FormSchema | null
  onClose: () => void
  onSubmit: (data: Partial<FormSchema>) => void
}

function SchemaModal({ schema, onClose, onSubmit }: SchemaModalProps) {
  const [formData, setFormData] = useState({
    name: schema?.name || '',
    description: schema?.description || '',
    max_fields: schema?.max_fields || 120,
    tat_hours_limit: schema?.tat_hours_limit || 24,
    fields_definition: schema?.fields_definition || []
  })

  const [newField, setNewField] = useState({
    name: '',
    display_name: '',
    field_type: 'STRING' as FormField['field_type'],
    is_required: true,
    is_unique: false,
    default_value: '',
    help_text: '',
    options: '', // For SELECT fields - comma-separated options
    order: 0
  })

  // Check if this is an existing schema (has an ID)
  const isExistingSchema = !!schema?.id

  const fieldTypes = [
    { value: 'NUMERIC', label: 'Numeric' },
    { value: 'STRING', label: 'String' },
    { value: 'ALPHANUMERIC', label: 'Alphanumeric' },
    { value: 'SYMBOLS_ALPHANUMERIC', label: 'Symbols + Alphanumeric' },
    { value: 'BOOLEAN', label: 'Boolean' },
    { value: 'DATE', label: 'Date' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'SELECT', label: 'Select/Dropdown' },
    { value: 'IMAGE_UPLOAD', label: 'Image Upload' },
    { value: 'DOCUMENT_UPLOAD', label: 'Document Upload' }
  ]

  const handleAddField = () => {
    if (newField.name && newField.display_name) {
      // Process options for SELECT fields
      let processedOptions: string[] | undefined
      if (newField.field_type === 'SELECT' && newField.options) {
        processedOptions = newField.options
          .split(',')
          .map(option => option.trim())
          .filter(option => option.length > 0)
      }
      
      const field: FormField = {
        id: `temp-${Date.now()}`,
        name: newField.name,
        display_name: newField.display_name,
        field_type: newField.field_type,
        is_required: newField.is_required,
        is_unique: newField.is_unique,
        default_value: newField.default_value,
        help_text: newField.help_text,
        order: newField.order,
        options: processedOptions,
        is_active: true,
        organization: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        validation_rules: {}
      }
      
      setFormData({
        ...formData,
        fields_definition: [...formData.fields_definition, field]
      })
      
      setNewField({
        name: '',
        display_name: '',
        field_type: 'STRING',
        is_required: true,
        is_unique: false,
        default_value: '',
        help_text: '',
        options: '',
        order: formData.fields_definition.length
      })
    }
  }

  const handleRemoveField = (index: number) => {
    const updatedFields = formData.fields_definition.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      fields_definition: updatedFields
    })
  }

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const fields = [...formData.fields_definition]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex >= 0 && newIndex < fields.length) {
      [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]]
      setFormData({
        ...formData,
        fields_definition: fields
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {schema ? 'Edit Form Schema' : 'Create New Form Schema'}
        </h3>
        
        {isExistingSchema && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> You can now add, remove, and modify fields in existing schemas. 
              Removed fields will be deprecated (hidden from new entries but preserved for existing data).
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Schema Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="max_fields">Max Fields</Label>
              <Input
                id="max_fields"
                type="number"
                min="1"
                max="120"
                value={formData.max_fields}
                onChange={(e) => setFormData({ ...formData, max_fields: parseInt(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tat_hours_limit">TAT Hours Limit</Label>
              <Input
                id="tat_hours_limit"
                type="number"
                min="1"
                max="720"
                value={formData.tat_hours_limit}
                onChange={(e) => setFormData({ ...formData, tat_hours_limit: parseInt(e.target.value) })}
                placeholder="24"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Time limit in hours for form completion</p>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Fields Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium">Form Fields</h4>
              <span className="text-sm text-gray-500">
                {formData.fields_definition.length}/{formData.max_fields} fields
              </span>
            </div>

            {/* Add New Field - Available for both new and existing schemas */}
            {formData.fields_definition.length < formData.max_fields && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="text-sm">Add New Field</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="field_name">Field Name</Label>
                      <Input
                        id="field_name"
                        value={newField.name}
                        onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                        placeholder="e.g., customer_name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="field_display_name">Display Name</Label>
                      <Input
                        id="field_display_name"
                        value={newField.display_name}
                        onChange={(e) => setNewField({ ...newField, display_name: e.target.value })}
                        placeholder="e.g., Customer Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="field_type">Field Type</Label>
                      <select
                        id="field_type"
                        value={newField.field_type}
                        onChange={(e) => setNewField({ ...newField, field_type: e.target.value as FormField['field_type'] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {fieldTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="field_default_value">Default Value</Label>
                      <Input
                        id="field_default_value"
                        value={newField.default_value}
                        onChange={(e) => setNewField({ ...newField, default_value: e.target.value })}
                        placeholder="Optional default value"
                      />
                    </div>
                    <div>
                      <Label htmlFor="field_help_text">Help Text</Label>
                      <Input
                        id="field_help_text"
                        value={newField.help_text}
                        onChange={(e) => setNewField({ ...newField, help_text: e.target.value })}
                        placeholder="Optional help text"
                      />
                    </div>
                  </div>

                  {newField.field_type === 'SELECT' && (
                    <div>
                      <Label htmlFor="field_options">Options (comma-separated)</Label>
                      <Input
                        id="field_options"
                        value={newField.options}
                        onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                        placeholder="e.g., Option 1, Option 2, Option 3"
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter options for the select field, separated by commas.</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newField.is_required}
                        onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Required</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newField.is_unique}
                        onChange={(e) => setNewField({ ...newField, is_unique: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm">Unique</span>
                    </label>
                  </div>

                  <Button
                    type="button"
                    onClick={handleAddField}
                    disabled={!newField.name || !newField.display_name}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Existing Fields */}
            {formData.fields_definition.length > 0 && (
              <div className="space-y-2">
                {formData.fields_definition.map((field, index) => (
                  <Card key={field.id || index}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="font-medium">{field.display_name}</span>
                              <span className="text-sm text-gray-500 ml-2">({field.field_type})</span>
                            </div>
                            {field.is_required && (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Required</span>
                            )}
                            {field.is_unique && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Unique</span>
                            )}
                          </div>
                          {field.help_text && (
                            <p className="text-sm text-gray-600 mt-1">{field.help_text}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveField(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveField(index, 'down')}
                            disabled={index === formData.fields_definition.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          {/* Remove button - now available for existing schemas too (deprecates field) */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveField(index)}
                            className="text-red-600 hover:text-red-700"
                            title={isExistingSchema ? "Remove field (will be deprecated)" : "Remove field"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              {schema ? 'Update' : 'Create'} Schema
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
