'use client'

import React, { useEffect, useState } from 'react'
import { SuperAdminNavigation } from '@/components/dashboard/SuperAdminNavigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2, Plus, Search, Edit, Trash2, Eye } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { OrganizationModal } from '@/components/forms/OrganizationModal'

export default function SuperAdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedOrganization, setSelectedOrganization] = useState(null)

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getOrganizations()
      setOrganizations(response.results || response || [])
    } catch (error) {
      console.error('Error fetching organizations:', error)
      toast.error('Failed to load organizations')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (organization: any) => {
    setSelectedOrganization(organization)
    setModalOpen(true)
  }

  const handleDelete = async (organization: any) => {
    if (confirm(`Are you sure you want to delete ${organization.display_name}?`)) {
      try {
        await apiClient.deleteOrganization(organization.id)
        toast.success('Organization deleted successfully')
        fetchOrganizations()
      } catch (error) {
        console.error('Error deleting organization:', error)
        toast.error('Failed to delete organization')
      }
    }
  }

  const handleAddNew = () => {
    setSelectedOrganization(null)
    setModalOpen(true)
  }

  const handleModalSuccess = () => {
    fetchOrganizations()
  }

  const filteredOrganizations = organizations.filter((org: any) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <SuperAdminNavigation>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
            <p className="text-gray-600">Manage all organizations in the system</p>
          </div>
          <Button className="flex items-center space-x-2" onClick={handleAddNew}>
            <Plus className="h-4 w-4" />
            <span>Add Organization</span>
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">Filter</Button>
            </div>
          </CardContent>
        </Card>

        {/* Organizations List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-gray-600">Loading organizations...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrganizations.map((org: any) => (
              <Card key={org.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5 text-purple-600" />
                      <CardTitle className="text-lg">{org.display_name}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(org)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(org)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Email:</span> {org.email}</div>
                    <div><span className="font-medium">Type:</span> {org.business_type}</div>
                    <div><span className="font-medium">Status:</span> 
                      <span className={`ml-1 px-2 py-1 rounded-full text-xs ${
                        org.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {org.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div><span className="font-medium">Employees:</span> {org.active_employees_count || 0}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredOrganizations.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No organizations found</p>
          </div>
        )}

        {/* Organization Modal */}
        <OrganizationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          organization={selectedOrganization}
          onSuccess={handleModalSuccess}
        />
      </div>
    </SuperAdminNavigation>
  )
} 