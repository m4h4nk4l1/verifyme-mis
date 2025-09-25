'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormEntry, FormSchema } from '@/types/api'
import { apiClient } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, RefreshCw, AlertTriangle, Upload, FileText, X } from 'lucide-react'
import { toast } from 'sonner'

interface FormViewProps {
  schema?: FormSchema
  onEntryCreated?: (entry: FormEntry) => void
  readOnly?: boolean
}

interface FormField {
  id: string
  name: string
  display_name: string
  field_type: 'NUMERIC' | 'STRING' | 'ALPHANUMERIC' | 'SYMBOLS_ALPHANUMERIC' | 'BOOLEAN' | 'DATE' | 'EMAIL' | 'PHONE' | 'SELECT' | 'IMAGE_UPLOAD' | 'DOCUMENT_UPLOAD'
  validation_rules: Record<string, unknown>
  is_required: boolean
  is_unique: boolean
  default_value?: string
  help_text?: string
  order: number
  is_active: boolean
  options?: string[] // For SELECT fields
}

export function FormView({ 
  schema, 
  onEntryCreated, 
  readOnly = false 
}: FormViewProps) {
  const { user } = useAuth() as { user: { organization: string; id: string } }
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [submitting, setSubmitting] = useState(false)
  const [selectedSchema, setSelectedSchema] = useState<FormSchema | null>(schema || null)
  const [schemas, setSchemas] = useState<FormSchema[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})

  // Fetch available schemas
  useEffect(() => {
    const fetchSchemas = async () => {
      try {
        console.log('🔍 Fetching schemas for user organization...')
        const response = await apiClient.getFormSchemas({ is_active: true })
        const activeSchemas = response.results || []
        console.log('🔍 Schemas returned:', activeSchemas.length)
        console.log('🔍 Schema details:', activeSchemas.map((s: { id: string; name: string; organization: string }) => ({ id: s.id, name: s.name, organization: s.organization })))
        setSchemas(activeSchemas)
        
        if (!selectedSchema && activeSchemas.length > 0) {
          setSelectedSchema(activeSchemas[0])
        }
      } catch (error) {
        console.error('Error fetching schemas:', error)
        toast.error('Failed to load form schemas')
      }
    }

    fetchSchemas()
  }, [])

  // Initialize form data when schema changes
  useEffect(() => {
    if (selectedSchema && selectedSchema.fields_definition) {
      const initialData: Record<string, unknown> = {}
      // Only include active fields for create/edit
      selectedSchema.fields_definition
        .filter((field: FormField) => (field as any).is_active !== false)
        .forEach((field: FormField) => {
        if (field.default_value) {
          initialData[field.name] = field.default_value
        }
      })
      setFormData(initialData)
    }
  }, [selectedSchema])

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }))
  }

  const handleFileUpload = async (fieldName: string, file: File) => {
    if (!file) return

    // Validate file type based on field type
    const field = selectedSchema?.fields_definition?.find(f => f.name === fieldName)
    if (!field) return

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const allowedDocumentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

    let allowedTypes: string[] = []
    if (field.field_type === 'IMAGE_UPLOAD') {
      allowedTypes = allowedImageTypes
    } else if (field.field_type === 'DOCUMENT_UPLOAD') {
      allowedTypes = [...allowedImageTypes, ...allowedDocumentTypes]
    }

    if (!allowedTypes.includes(file.type)) {
      toast.error(`Invalid file type. Allowed: ${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`)
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setUploadingFiles(prev => ({ ...prev, [fieldName]: true }))

    try {
      // For now, we'll store the file object in form data
      // In a real implementation, you'd upload to the backend first
      handleFieldChange(fieldName, file)
      toast.success('File selected successfully')
    } catch (error) {
      console.error('Error handling file:', error)
      toast.error('Error processing file')
    } finally {
      setUploadingFiles(prev => ({ ...prev, [fieldName]: false }))
    }
  }

  const removeFile = (fieldName: string) => {
    handleFieldChange(fieldName, null)
    toast.success('File removed')
  }

  const validateForm = (): boolean => {
    if (!selectedSchema || !selectedSchema.fields_definition) return false

    for (const field of selectedSchema.fields_definition) {
      if (field.is_required && (!formData[field.name] || formData[field.name] === '')) {
        toast.error(`${field.display_name} is required`)
        return false
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!selectedSchema) {
      toast.error('Please select a form schema')
      return
    }

    if (!validateForm()) return

    setSubmitting(true)
    let tempEntryId: string | null = null
    
    try {
      // First, upload any files that are File objects
      const processedFormData = { ...formData }
      const fileUploadPromises: Promise<void>[] = []
      const filesToUpload: { fieldName: string; file: File; field: FormField }[] = []

      // Collect all files that need to be uploaded
      for (const [fieldName, value] of Object.entries(formData)) {
        if (value instanceof File) {
          const field = selectedSchema.fields_definition?.find(f => f.name === fieldName)
          if (field) {
            filesToUpload.push({ fieldName, file: value, field })
          }
        }
      }

      // If there are files to upload, create a single temporary entry
      if (filesToUpload.length > 0) {
        console.log(`📋 Creating single temp entry for ${filesToUpload.length} files`)
                const tempEntryData = {
                  form_schema: selectedSchema.id,
          form_data: { temp: 'temp' }, // Temporary data
                  organization: user.organization,
                  employee: user.id
                }
                
        try {
                const tempEntry = await apiClient.createFormEntry(tempEntryData)
          tempEntryId = tempEntry.id
          console.log(`✅ Single temp entry created:`, tempEntryId)
        } catch (error) {
          console.error('❌ Failed to create temporary entry for file uploads:', error)
          toast.error('Failed to prepare file upload. Please try again.')
          setSubmitting(false)
          return
        }

        // Upload all files using the same temporary entry
        for (const { fieldName, file, field } of filesToUpload) {
          const uploadPromise = (async () => {
            try {
              console.log(`📤 Starting file upload for ${fieldName}:`, file.name)
                
                // Upload the file with the temporary form entry ID
                console.log(`📤 Uploading file to S3 for ${fieldName}`)
                const uploadedFile = await apiClient.uploadFormFieldFile(
                tempEntryId!,
                  fieldName,
                file,
                  `Uploaded for ${field.display_name}`
                )
                
                console.log(`✅ File uploaded successfully for ${fieldName}:`, uploadedFile)
              
              // Store the S3 URL in form data - try different possible field names
              const s3Url = uploadedFile.file_url || uploadedFile.s3_url || uploadedFile.url
              console.log(`💾 Extracted S3 URL: ${s3Url}`)
              
              if (s3Url) {
                processedFormData[fieldName] = s3Url
                console.log(`💾 Stored S3 URL for field ${fieldName}`)
                } else {
                console.error(`❌ No S3 URL found in response for ${fieldName}`)
                throw new Error(`No S3 URL returned for ${fieldName}`)
                }
                
              } catch (uploadError) {
                console.error(`❌ Error uploading file for ${fieldName}:`, uploadError)
                toast.error(`Failed to upload ${field.display_name}`)
                throw uploadError
              }
            })()
            
            fileUploadPromises.push(uploadPromise)
      }

      // Wait for all file uploads to complete
      if (fileUploadPromises.length > 0) {
          try {
        await Promise.all(fileUploadPromises)
          } catch (error) {
            console.error('❌ One or more file uploads failed:', error)
            // Clean up the temporary entry if file uploads failed
            if (tempEntryId) {
              try {
                await apiClient.deleteFormEntry(tempEntryId)
                console.log(`✅ Cleaned up temp entry after failed uploads: ${tempEntryId}`)
              } catch (cleanupError) {
                console.warn(`⚠️ Failed to cleanup temp entry ${tempEntryId}:`, cleanupError)
              }
            }
            setSubmitting(false)
            return
          }
        }
      }

      // Now create the form entry with all data (including file IDs)
      const entryData = {
        form_schema: selectedSchema.id,
        form_data: processedFormData // Now includes file IDs
        // Remove organization and employee - these are set automatically by backend
      }
      
      // Create the form entry with retry logic
      let newEntry
      let retryCount = 0
      const maxRetries = 3
      
      while (retryCount < maxRetries) {
        try {
          newEntry = await apiClient.createFormEntry(entryData)
          console.log('🎉 Form submitted successfully:', newEntry)
          toast.success('Form submitted successfully!')
          break // Success, exit the retry loop
        } catch (error: unknown) {
          retryCount++
          console.error(`=== FORM SUBMISSION ERROR (Attempt ${retryCount}/${maxRetries}) ===`)
          console.error('Error submitting form:', error)
          
          if (error && typeof error === 'object' && 'response' in error) {
            const errorResponse = error as { response?: { data?: { message?: string, error?: string }, status?: number } }
            
            // Check if it's a conflict error that we should retry
            if (errorResponse.response?.status === 409) {
              if (retryCount < maxRetries) {
                console.log(`🔄 Retrying form submission (${retryCount}/${maxRetries})...`)
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)) // Exponential backoff
                continue
              } else {
                toast.error('Form submission failed due to a conflict. Please try again.')
              }
            } else if (errorResponse.response?.data?.message === 'Potential duplicate entry detected') {
              toast.error('Duplicate entry detected. Please check your data.')
            } else if (errorResponse.response?.data?.error) {
              toast.error(errorResponse.response.data.error)
            } else {
              toast.error('Failed to submit form. Please try again.')
            }
          } else {
            toast.error('Failed to submit form. Please try again.')
          }
          
          // If we reach here, it's not a retryable error or we've exhausted retries
          break
        }
      }
      
      // If we reach here, the form submission was successful
      onEntryCreated?.(newEntry)
      
      // Clean up temporary entry after successful form submission
      if (tempEntryId) {
        console.log('🧹 Cleaning up temporary entry:', tempEntryId)
        try {
          await apiClient.deleteFormEntry(tempEntryId)
          console.log(`✅ Cleaned up temp entry: ${tempEntryId}`)
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp entry ${tempEntryId}:`, cleanupError)
          // Don't fail the entire operation if cleanup fails
        }
      }
      
      console.log('📋 Form data being submitted:', processedFormData)
      
      // Reset form
      if (selectedSchema.fields_definition) {
        const initialData: Record<string, unknown> = {}
        selectedSchema.fields_definition.forEach((field: FormField) => {
          if (field.default_value) {
            initialData[field.name] = field.default_value
          }
        })
        setFormData(initialData)
      }
    } catch (error) {
      console.error('=== FORM SUBMISSION ERROR ===')
      console.error('Error submitting form:', error)
      
      // Clean up temporary entry if form submission failed
      if (tempEntryId) {
        try {
          await apiClient.deleteFormEntry(tempEntryId)
          console.log(`✅ Cleaned up temp entry after failed submission: ${tempEntryId}`)
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup temp entry ${tempEntryId}:`, cleanupError)
        }
      }
      
      toast.error('Failed to submit form. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (field: FormField) => {
    const value = formData[field.name] || ''
    const isRequired = field.is_required
    const isUploading = uploadingFiles[field.name]

    switch (field.field_type) {
      case 'BOOLEAN':
        return (
          <div className="flex items-center space-x-3 p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all duration-200 shadow-sm">
            <input
              type="checkbox"
              id={field.name}
              checked={Boolean(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              disabled={readOnly}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
            />
            <Label htmlFor={field.name} className={`text-base font-semibold ${isRequired ? 'text-red-600' : 'text-gray-800'}`}>
              {field.display_name} {isRequired && <span className="text-red-500 font-bold">*</span>}
            </Label>
          </div>
        )

      case 'DATE':
        return (
          <div className="space-y-3 group">
            <Label htmlFor={field.name} className={`text-base font-semibold ${isRequired ? 'text-red-600' : 'text-gray-800'}`}>
              {field.display_name} {isRequired && <span className="text-red-500 font-bold">*</span>}
            </Label>
            <Input
              id={field.name}
              type="date"
              value={String(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              disabled={readOnly}
              required={isRequired}
              className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 rounded-xl transition-all duration-200 text-base font-medium"
            />
          </div>
        )

      case 'EMAIL':
        return (
          <div className="space-y-3 group">
            <Label htmlFor={field.name} className={`text-base font-semibold ${isRequired ? 'text-red-600' : 'text-gray-800'}`}>
              {field.display_name} {isRequired && <span className="text-red-500 font-bold">*</span>}
            </Label>
            <Input
              id={field.name}
              type="email"
              value={String(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              disabled={readOnly}
              required={isRequired}
              placeholder={`Enter ${field.display_name.toLowerCase()}`}
              className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 rounded-xl transition-all duration-200 text-base font-medium"
            />
          </div>
        )

      case 'PHONE':
        return (
          <div className="space-y-3 group">
            <Label htmlFor={field.name} className={`text-base font-semibold ${isRequired ? 'text-red-600' : 'text-gray-800'}`}>
              {field.display_name} {isRequired && <span className="text-red-500 font-bold">*</span>}
            </Label>
            <Input
              id={field.name}
              type="tel"
              value={String(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              disabled={readOnly}
              required={isRequired}
              placeholder={`Enter ${field.display_name.toLowerCase()}`}
              className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 rounded-xl transition-all duration-200 text-base font-medium"
            />
          </div>
        )

      case 'NUMERIC':
        return (
          <div className="space-y-3 group">
            <Label htmlFor={field.name} className={`text-base font-semibold ${isRequired ? 'text-red-600' : 'text-gray-800'}`}>
              {field.display_name} {isRequired && <span className="text-red-500 font-bold">*</span>}
            </Label>
            <Input
              id={field.name}
              type="number"
              value={String(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              disabled={readOnly}
              required={isRequired}
              placeholder={`Enter ${field.display_name.toLowerCase()}`}
              className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 rounded-xl transition-all duration-200 text-base font-medium"
            />
          </div>
        )

      case 'SELECT':
        return (
          <div className="space-y-3 group">
            <Label htmlFor={field.name} className={`text-base font-semibold ${isRequired ? 'text-red-600' : 'text-gray-800'}`}>
              {field.display_name} {isRequired && <span className="text-red-500 font-bold">*</span>}
            </Label>
            <select
              id={field.name}
              value={String(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              disabled={readOnly}
              required={isRequired}
              className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 rounded-xl transition-all duration-200 text-base font-medium"
            >
              <option value="">Select an option</option>
              {field.options?.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )

      case 'IMAGE_UPLOAD':
      case 'DOCUMENT_UPLOAD':
        return (
          <div className="space-y-3 group">
            <Label htmlFor={field.name} className={`text-base font-semibold ${isRequired ? 'text-red-600' : 'text-gray-800'}`}>
              {field.display_name} {isRequired && <span className="text-red-500 font-bold">*</span>}
            </Label>
            
            {value && (value instanceof File || (typeof value === 'string' && value.startsWith('http'))) ? (
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-sm">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  {value instanceof File ? (
                    <div>
                      <span className="text-sm font-bold text-gray-900">{value.name}</span>
                      <span className="text-xs text-gray-500 ml-2 font-medium">
                    ({(value.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                    </div>
                  ) : (
                    <a 
                      href={value as string} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                    >
                      📎 View Uploaded File
                    </a>
                  )}
                </div>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(field.name)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <label 
                  htmlFor={`file-${field.name}`} 
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 group"
                >
                  <div className="flex flex-col items-center justify-center pt-4 pb-4">
                    {isUploading ? (
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                        <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                        <Upload className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                    <p className="mb-1 text-sm font-bold text-gray-700">
                      {isUploading ? (
                        <span className="font-bold text-blue-600">Uploading...</span>
                      ) : (
                        <span className="font-bold">Click to upload</span>
                      )} or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      {field.field_type === 'IMAGE_UPLOAD' 
                        ? 'PNG, JPG, JPEG, GIF, WEBP (MAX. 5MB)'
                        : 'PNG, JPG, JPEG, GIF, WEBP, PDF, DOC, DOCX (MAX. 5MB)'
                      }
                    </p>
                  </div>
                  <input
                    id={`file-${field.name}`}
                    type="file"
                    className="hidden"
                    accept={field.field_type === 'IMAGE_UPLOAD' 
                      ? '.png,.jpg,.jpeg,.gif,.webp'
                      : '.png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx'
                    }
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleFileUpload(field.name, file)
                      }
                    }}
                    disabled={readOnly || isUploading}
                  />
                </label>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="space-y-3 group">
            <Label htmlFor={field.name} className={`text-base font-semibold ${isRequired ? 'text-red-600' : 'text-gray-800'}`}>
              {field.display_name} {isRequired && <span className="text-red-500 font-bold">*</span>}
            </Label>
            <Input
              id={field.name}
              type="text"
              value={String(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              disabled={readOnly}
              required={isRequired}
              placeholder={`Enter ${field.display_name.toLowerCase()}`}
              className="h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 rounded-xl transition-all duration-200 text-base font-medium"
            />
          </div>
        )
    }
  }

  const groupFieldsBySection = (fields: FormField[]) => {
    // Remove section grouping - all fields go into one unified section
    return { 'Form Fields': fields }
  }

  if (!selectedSchema) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No form schema available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const fields = selectedSchema.fields_definition || []
  const sections = groupFieldsBySection(fields)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Enhanced Form Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-8 mb-8 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
        <div>
                <h1 className="text-4xl font-bold text-gray-900">
                  Create New Form Entry
                </h1>
                <p className="text-lg text-gray-600 mt-2 font-medium">Fill out the form below to create a new entry</p>
              </div>
            </div>
        </div>
        
          {/* Enhanced Schema Selection */}
          <div className="flex items-center gap-4 bg-white rounded-xl p-4 border-2 border-blue-200 shadow-lg">
            <Label htmlFor="schema-select" className="text-base font-bold text-gray-800 whitespace-nowrap">
              Form Type:
            </Label>
          <select
            id="schema-select"
            value={selectedSchema.id}
            onChange={(e) => {
              const newSchema = schemas.find(s => s.id === e.target.value)
              if (newSchema) setSelectedSchema(newSchema)
            }}
            disabled={readOnly}
              className="px-6 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 font-bold min-w-[250px] text-base"
          >
            {schemas.map((schema) => (
              <option key={schema.id} value={schema.id}>
                {schema.name}
              </option>
            ))}
          </select>
        </div>
      </div>
                  </div>

      {/* Enhanced Form Content */}
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-8">
        {/* Unified Form Fields Section */}
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold">📝</span>
                  </div>
              Form Details
                </CardTitle>
              </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sections['Form Fields'].map((field) => (
                <div key={field.name} className="group">
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

        {/* Enhanced Submit Button */}
        {!readOnly && (
          <div className="flex justify-center pt-8">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-1 shadow-lg">
            <Button
              type="submit"
              disabled={submitting}
                className="bg-white text-blue-600 hover:bg-gray-50 border-0 px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-200 hover:shadow-xl"
            >
              {submitting ? (
                <>
                    <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                    Creating Entry...
                </>
              ) : (
                <>
                    <Plus className="h-5 w-5 mr-3" />
                    Create Entry
                </>
              )}
            </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
} 