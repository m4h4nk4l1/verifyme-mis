'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, FileText } from 'lucide-react'
import { toast } from 'sonner'

interface FormField {
  id: string
  name: string
  display_name: string
  field_type: 'NUMERIC' | 'STRING' | 'ALPHANUMERIC' | 'SYMBOLS_ALPHANUMERIC' | 'BOOLEAN' | 'DATE' | 'EMAIL' | 'PHONE'
  validation_rules: Record<string, unknown>
  is_required: boolean
  is_unique: boolean
  default_value?: string
  help_text?: string
  order: number
  is_active: boolean
}

interface FieldEditorProps {
  fields: FormField[]
  onFieldsChange: (fields: FormField[]) => void
  maxFields?: number
  isExistingSchema?: boolean
}

export function FieldEditor({ fields, onFieldsChange, maxFields = 120, isExistingSchema = false }: FieldEditorProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [fieldFormData, setFieldFormData] = useState<Partial<FormField>>({
    name: '',
    display_name: '',
    field_type: 'STRING',
    is_required: true,
    is_unique: false,
    is_active: true,
    order: 0,
    validation_rules: {},
    help_text: '',
    default_value: ''
  })

  const fieldTypes = [
    { value: 'STRING', label: 'Text' },
    { value: 'NUMERIC', label: 'Number' },
    { value: 'ALPHANUMERIC', label: 'Alphanumeric' },
    { value: 'SYMBOLS_ALPHANUMERIC', label: 'Symbols + Alphanumeric' },
    { value: 'BOOLEAN', label: 'Boolean' },
    { value: 'DATE', label: 'Date' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Phone' }
  ]

  const handleAddField = () => {
    if (fields.length >= maxFields) {
      toast.error(`Maximum ${maxFields} fields allowed`)
      return
    }

    if (!fieldFormData.name || !fieldFormData.display_name) {
      toast.error('Field name and display name are required')
      return
    }

    const newField: FormField = {
      id: crypto.randomUUID(),
      name: fieldFormData.name,
      display_name: fieldFormData.display_name,
      field_type: fieldFormData.field_type || 'STRING',
      is_required: fieldFormData.is_required || false,
      is_unique: fieldFormData.is_unique || false,
      is_active: fieldFormData.is_active || true,
      order: fields.length,
      validation_rules: fieldFormData.validation_rules || {},
      help_text: fieldFormData.help_text || '',
      default_value: fieldFormData.default_value || ''
    }

    onFieldsChange([...fields, newField])
    setShowAddDialog(false)
    resetFieldForm()
    toast.success('Field added successfully')
  }

  const handleEditField = () => {
    if (!editingField) return

    const updatedField: FormField = {
      ...editingField,
      name: fieldFormData.name || editingField.name,
      display_name: fieldFormData.display_name || editingField.display_name,
      field_type: fieldFormData.field_type || editingField.field_type,
      is_required: fieldFormData.is_required ?? editingField.is_required,
      is_unique: fieldFormData.is_unique ?? editingField.is_unique,
      is_active: fieldFormData.is_active ?? editingField.is_active,
      validation_rules: fieldFormData.validation_rules || editingField.validation_rules,
      help_text: fieldFormData.help_text || editingField.help_text,
      default_value: fieldFormData.default_value || editingField.default_value
    }

    const updatedFields = fields.map(f => f.id === editingField.id ? updatedField : f)
    onFieldsChange(updatedFields)
    setEditingField(null)
    resetFieldForm()
    toast.success('Field updated successfully')
  }

  const handleDeleteField = (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return

    const updatedFields = fields.filter(f => f.id !== fieldId)
    onFieldsChange(updatedFields)
    toast.success('Field deleted successfully')
  }

  const handleEditClick = (field: FormField) => {
    setEditingField(field)
    setFieldFormData({
      name: field.name,
      display_name: field.display_name,
      field_type: field.field_type,
      is_required: field.is_required,
      is_unique: field.is_unique,
      is_active: field.is_active,
      validation_rules: field.validation_rules,
      help_text: field.help_text,
      default_value: field.default_value
    })
  }

  const resetFieldForm = () => {
    setFieldFormData({
      name: '',
      display_name: '',
      field_type: 'STRING',
      is_required: true,
      is_unique: false,
      is_active: true,
      order: 0,
      validation_rules: {},
      help_text: '',
      default_value: ''
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Form Fields</h3>
          <p className="text-sm text-gray-600">
            {fields.length} of {maxFields} fields used
          </p>
        </div>

        {/* Only show Add Field button for new schemas */}
        {!isExistingSchema && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button 
                size="sm"
                disabled={fields.length >= maxFields}
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Field</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="field-name">Field Name</Label>
                  <Input
                    id="field-name"
                    value={fieldFormData.name}
                    onChange={(e) => setFieldFormData({...fieldFormData, name: e.target.value})}
                    placeholder="e.g., customer_name"
                  />
                </div>

                <div>
                  <Label htmlFor="field-display-name">Display Name</Label>
                  <Input
                    id="field-display-name"
                    value={fieldFormData.display_name}
                    onChange={(e) => setFieldFormData({...fieldFormData, display_name: e.target.value})}
                    placeholder="e.g., Customer Name"
                  />
                </div>

                <div>
                  <Label htmlFor="field-type">Field Type</Label>
                  <select
                    id="field-type"
                    value={fieldFormData.field_type}
                    onChange={(e) => setFieldFormData({...fieldFormData, field_type: e.target.value as FormField['field_type']})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {fieldTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="field-help">Help Text</Label>
                  <Input
                    id="field-help"
                    value={fieldFormData.help_text}
                    onChange={(e) => setFieldFormData({...fieldFormData, help_text: e.target.value})}
                    placeholder="Optional help text"
                  />
                </div>

                <div>
                  <Label htmlFor="field-default">Default Value</Label>
                  <Input
                    id="field-default"
                    value={fieldFormData.default_value}
                    onChange={(e) => setFieldFormData({...fieldFormData, default_value: e.target.value})}
                    placeholder="Optional default value"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="field-required"
                      checked={fieldFormData.is_required}
                      onChange={(e) => setFieldFormData({...fieldFormData, is_required: e.target.checked})}
                      className="rounded"
                    />
                    <Label htmlFor="field-required">Required</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="field-unique"
                      checked={fieldFormData.is_unique}
                      onChange={(e) => setFieldFormData({...fieldFormData, is_unique: e.target.checked})}
                      className="rounded"
                    />
                    <Label htmlFor="field-unique">Unique</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="field-active"
                      checked={fieldFormData.is_active}
                      onChange={(e) => setFieldFormData({...fieldFormData, is_active: e.target.checked})}
                      className="rounded"
                    />
                    <Label htmlFor="field-active">Active</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddField}>
                    Add Field
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Warning for existing schemas */}
      {isExistingSchema && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> For existing schemas, you can only reorder fields. 
            Adding, removing, or modifying field properties is not allowed to maintain data integrity.
          </p>
        </div>
      )}

      {/* Fields List */}
      {fields.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No fields defined</p>
              {!isExistingSchema && (
                <p className="text-sm text-gray-400">Add your first field to get started</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <Card key={field.id}>
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
                      onClick={() => {
                        // Reorder fields - move up
                        const newFields = [...fields]
                        if (index > 0) {
                          [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]]
                          onFieldsChange(newFields)
                        }
                      }}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Reorder fields - move down
                        const newFields = [...fields]
                        if (index < fields.length - 1) {
                          [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]]
                          onFieldsChange(newFields)
                        }
                      }}
                      disabled={index === fields.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    {/* Only show edit and delete buttons for new schemas */}
                    {!isExistingSchema && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(field)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteField(field.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Field Dialog */}
      <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Field</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-field-name">Field Name</Label>
              <Input
                id="edit-field-name"
                value={fieldFormData.name}
                onChange={(e) => setFieldFormData({...fieldFormData, name: e.target.value})}
                placeholder="e.g., customer_name"
              />
            </div>

            <div>
              <Label htmlFor="edit-field-display-name">Display Name</Label>
              <Input
                id="edit-field-display-name"
                value={fieldFormData.display_name}
                onChange={(e) => setFieldFormData({...fieldFormData, display_name: e.target.value})}
                placeholder="e.g., Customer Name"
              />
            </div>

            <div>
              <Label htmlFor="edit-field-type">Field Type</Label>
              <select
                id="edit-field-type"
                value={fieldFormData.field_type}
                onChange={(e) => setFieldFormData({...fieldFormData, field_type: e.target.value as FormField['field_type']})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {fieldTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="edit-field-help">Help Text</Label>
              <Input
                id="edit-field-help"
                value={fieldFormData.help_text}
                onChange={(e) => setFieldFormData({...fieldFormData, help_text: e.target.value})}
                placeholder="Optional help text"
              />
            </div>

            <div>
              <Label htmlFor="edit-field-default">Default Value</Label>
              <Input
                id="edit-field-default"
                value={fieldFormData.default_value}
                onChange={(e) => setFieldFormData({...fieldFormData, default_value: e.target.value})}
                placeholder="Optional default value"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-field-required"
                  checked={fieldFormData.is_required}
                  onChange={(e) => setFieldFormData({...fieldFormData, is_required: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="edit-field-required">Required</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-field-unique"
                  checked={fieldFormData.is_unique}
                  onChange={(e) => setFieldFormData({...fieldFormData, is_unique: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="edit-field-unique">Unique</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-field-active"
                  checked={fieldFormData.is_active}
                  onChange={(e) => setFieldFormData({...fieldFormData, is_active: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="edit-field-active">Active</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingField(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditField}>
                Update Field
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 