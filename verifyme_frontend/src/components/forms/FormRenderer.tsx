'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormSchema, FormField } from '@/types'
import { AlertCircle, Upload, FileText } from 'lucide-react'

interface FormRendererProps {
  form: FormSchema
  onSubmit?: (formData: Record<string, unknown>) => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
  existingData?: Record<string, unknown>[]
}

export function FormRenderer({ 
  form, 
  onSubmit, 
  initialData = {}, 
  readOnly = false,
  existingData = []
}: FormRendererProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [duplicateFields, setDuplicateFields] = useState<Set<string>>(new Set())

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: ''
      }))
    }

    // Check for duplicates
    checkForDuplicates(fieldName, value)
  }

  const checkForDuplicates = (fieldName: string, value: unknown) => {
    if (!value || typeof value !== 'string') return

    const field = form.fields.find(f => f.name === fieldName)
    if (!field?.is_duplicate_check) return

    const isDuplicate = existingData.some(existing => {
      const existingValue = existing[fieldName]
      return existingValue === value
    })

    if (isDuplicate) {
      setDuplicateFields(prev => new Set([...prev, fieldName]))
      
      // Remove duplicate highlight after 3 seconds
      setTimeout(() => {
        setDuplicateFields(prev => {
          const newSet = new Set(prev)
          newSet.delete(fieldName)
          return newSet
        })
      }, 3000)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    form.fields.forEach(field => {
      const value = formData[field.name]
      
      if (field.is_required && (!value || (typeof value === 'string' && value.trim() === ''))) {
        newErrors[field.name] = `${field.display_name} is required`
      }
      
      if (field.field_type === 'numeric' && value && typeof value === 'string') {
        if (isNaN(Number(value))) {
          newErrors[field.name] = 'Please enter a valid number'
        }
      }

      if (field.field_type === 'alphanumeric' && value && typeof value === 'string') {
        const alphanumericRegex = /^[a-zA-Z0-9]+$/
        if (!alphanumericRegex.test(value)) {
          newErrors[field.name] = 'Please enter only letters and numbers'
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Ensure all boolean fields are present in formData (send false if unchecked)
    form.fields.forEach(field => {
      if (field.field_type === 'boolean' && typeof formData[field.name] === 'undefined') {
        formData[field.name] = false
      }
    })

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit?.(formData)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderField = (field: FormField) => {
    const value = formData[field.name] || ''
    const error = errors[field.name]
    const isDuplicate = duplicateFields.has(field.name)

    const commonProps = {
      id: field.name,
      name: field.name,
      value: value as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => 
        handleFieldChange(field.name, e.target.value),
      disabled: readOnly,
      className: `mt-1 ${error ? 'border-red-500' : ''} ${isDuplicate ? 'duplicate-highlight' : ''}`,
    }

    switch (field.field_type) {
      case 'boolean':
        return (
          <div className="flex items-center mt-1">
            <input
              type="checkbox"
              id={field.name}
              name={field.name}
              checked={Boolean(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              disabled={readOnly}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor={field.name} className="ml-2 text-sm text-gray-700">
              {field.display_name}
            </label>
          </div>
        )

      case 'date':
        return (
          <Input
            {...commonProps}
            type="date"
            placeholder={`Select ${field.display_name.toLowerCase()}`}
          />
        )

      case 'datetime':
        return (
          <Input
            {...commonProps}
            type="datetime-local"
            placeholder={`Select ${field.display_name.toLowerCase()}`}
          />
        )

      case 'file':
        return (
          <div className="mt-1">
            <div className="flex items-center justify-center w-full">
              <label htmlFor={`file-${field.name}`} className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, JPEG, PDF, DOCX (MAX. 10MB)</p>
                </div>
                <input
                  id={`file-${field.name}`}
                  type="file"
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.pdf,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    handleFieldChange(field.name, file)
                  }}
                  disabled={readOnly}
                />
              </label>
            </div>
            {value && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                <span>{typeof value === 'string' ? value : (value as File)?.name}</span>
              </div>
            )}
          </div>
        )

      case 'numeric':
        return (
          <Input
            {...commonProps}
            type="number"
            placeholder={`Enter ${field.display_name.toLowerCase()}`}
          />
        )

      default:
        return (
          <Input
            {...commonProps}
            type="text"
            placeholder={`Enter ${field.display_name.toLowerCase()}`}
          />
        )
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{form.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</CardTitle>
        {form.description && (
          <p className="text-gray-600">{form.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {form.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                {field.display_name}
                {field.is_required && <span className="text-red-500 ml-1">*</span>}
                {field.is_duplicate_check && <span className="text-blue-500 ml-1">(Duplicate Check)</span>}
              </label>
              
              {renderField(field)}
              
              {field.help_text && (
                <p className="text-sm text-gray-500">{field.help_text}</p>
              )}
              
              {errors[field.name] && (
                <p className="text-sm text-red-500">{errors[field.name]}</p>
              )}

              {duplicateFields.has(field.name) && (
                <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-orange-800">
                    This value already exists in the system
                  </span>
                </div>
              )}
            </div>
          ))}

          {!readOnly && (
            <div className="flex justify-end space-x-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormData(initialData)}
                disabled={isSubmitting}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
