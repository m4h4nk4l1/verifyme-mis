'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Plus, Edit, Eye, Trash2, FileText } from 'lucide-react'
import { FormSchema } from '@/types'

interface FormListProps {
  onEdit?: (form: FormSchema) => void
  onView?: (form: FormSchema) => void
  onDelete?: (formId: string) => void
  onCreateNew?: () => void
}

export function FormList({ onEdit, onView, onDelete, onCreateNew }: FormListProps) {
  const [forms, setForms] = useState<FormSchema[]>([])
  const [filteredForms, setFilteredForms] = useState<FormSchema[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const filterForms = useCallback(() => {
    let filtered = forms

    if (searchTerm) {
      filtered = filtered.filter(form => 
        form.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredForms(filtered)
  }, [forms, searchTerm])

  useEffect(() => {
    fetchForms()
  }, [])

  useEffect(() => {
    filterForms()
  }, [filterForms])

  const fetchForms = async () => {
    try {
      setIsLoading(true)
      // Mock data for now - replace with actual API call
      const mockForms: FormSchema[] = [
        {
          id: '1',
          name: 'employment_verification',
          description: 'Employment verification form for background checks',
          fields: [],
          is_active: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-15T10:30:00Z',
        },
        {
          id: '2',
          name: 'education_verification',
          description: 'Education verification form for academic credentials',
          fields: [],
          is_active: true,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-14T15:20:00Z',
        },
        {
          id: '3',
          name: 'reference_check',
          description: 'Reference check form for character verification',
          fields: [],
          is_active: false,
          created_at: '2024-01-03T00:00:00Z',
          updated_at: '2024-01-13T09:45:00Z',
        },
      ]
      setForms(mockForms)
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setIsLoading(false)
    }
  }



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getFormStats = () => {
    const total = forms.length
    const active = forms.filter(form => form.is_active).length
    const inactive = total - active

    return { total, active, inactive }
  }

  const stats = getFormStats()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forms</h1>
          <p className="text-gray-600">Manage your dynamic forms</p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Form
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <FileText className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Forms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search forms by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Forms List */}
      <Card>
        <CardHeader>
          <CardTitle>Forms ({filteredForms.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading forms...</p>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm ? 'No forms found matching your search.' : 'No forms created yet.'}
              </p>
              {!searchTerm && (
                <Button onClick={onCreateNew} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Form
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredForms.map((form) => (
                <div
                  key={form.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{form.name}</h3>
                      <p className="text-sm text-gray-600">{form.description}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`px-2 py-1 text-xs rounded-full ${form.is_active ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                          {form.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Created {formatDate(form.created_at)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {form.fields.length} fields
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView?.(form)}
                      title="View Form"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit?.(form)}
                      title="Edit Form"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete?.(form.id)}
                      title="Delete Form"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
