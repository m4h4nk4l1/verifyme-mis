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
import { 
  Plus, 
  Building2, 
  Users, 
  Edit, 
  Trash2, 
  Search
} from 'lucide-react'
import { Organization, User, OrganizationStatistics } from '@/types/api'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface CreateOrganizationData {
  name: string
  display_name: string
  email: string
  phone: string
  business_type: 'BANK' | 'NBFC' | 'FINANCIAL_SERVICES' | 'OTHER'
  max_employees: number
  tat_hours_limit: number
  address_data: {
    address: string
    city: string
    state: string
    pincode: string
  }
}

interface CreateAdminData {
  email: string
  password: string
  first_name: string
  last_name: string
  phone: string
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [statistics, setStatistics] = useState<OrganizationStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showAdminDialog, setShowAdminDialog] = useState(false)
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
  const [organizationUsers, setOrganizationUsers] = useState<User[]>([])

  // Form states
  const [orgFormData, setOrgFormData] = useState<CreateOrganizationData>({
    name: '',
    display_name: '',
    email: '',
    phone: '',
    business_type: 'BANK',
    max_employees: 50,
    tat_hours_limit: 24,
    address_data: {
      address: '',
      city: '',
      state: '',
      pincode: ''
    }
  })

  const [adminFormData, setAdminFormData] = useState<CreateAdminData>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: ''
  })

  useEffect(() => {
    fetchOrganizations()
    fetchStatistics()
  }, [])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getOrganizations()
      setOrganizations(response.results)
    } catch (error) {
      console.error('Error fetching organizations:', error)
      toast.error('Failed to fetch organizations')
    } finally {
      setLoading(false)
    }
  }

  const fetchStatistics = async () => {
    try {
      const stats = await apiClient.getOrganizationStatistics()
      setStatistics(stats)
    } catch (error) {
      console.error('Error fetching statistics:', error)
    }
  }

  const fetchOrganizationUsers = async (orgId: string) => {
    try {
      const response = await apiClient.getOrganizationUsers(orgId)
      setOrganizationUsers(response.results)
    } catch (error) {
      console.error('Error fetching organization users:', error)
      toast.error('Failed to fetch organization users')
    }
  }

  const handleCreateOrganization = async () => {
    try {
      await apiClient.createOrganization(orgFormData)
      toast.success('Organization created successfully')
      setShowCreateDialog(false)
      setOrgFormData({
        name: '',
        display_name: '',
        email: '',
        phone: '',
        business_type: 'BANK',
        max_employees: 50,
        tat_hours_limit: 24,
        address_data: {
          address: '',
          city: '',
          state: '',
          pincode: ''
        }
      })
      fetchOrganizations()
      fetchStatistics()
    } catch (error) {
      console.error('Error creating organization:', error)
      toast.error('Failed to create organization')
    }
  }

  const handleCreateAdmin = async () => {
    if (!selectedOrganization) return

    try {
      await apiClient.createOrganizationAdmin(selectedOrganization.id, adminFormData)
      toast.success('Admin created successfully')
      setShowAdminDialog(false)
      setAdminFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: ''
      })
      fetchOrganizationUsers(selectedOrganization.id)
    } catch (error) {
      console.error('Error creating admin:', error)
      toast.error('Failed to create admin')
    }
  }

  const handleDeleteOrganization = async (org: Organization) => {
    if (!confirm(`Are you sure you want to delete ${org.display_name}? This action cannot be undone.`)) {
      return
    }

    try {
      await apiClient.deleteOrganization(org.id)
      toast.success('Organization deleted successfully')
      fetchOrganizations()
      fetchStatistics()
    } catch (error) {
      console.error('Error deleting organization:', error)
      toast.error('Failed to delete organization')
    }
  }

  const handleViewUsers = async (org: Organization) => {
    setSelectedOrganization(org)
    await fetchOrganizationUsers(org.id)
    setShowAdminDialog(true)
  }

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'active' && org.is_active) ||
                         (filterType === 'inactive' && !org.is_active) ||
                         (filterType === 'bank' && org.business_type === 'BANK') ||
                         (filterType === 'nbfc' && org.business_type === 'NBFC')

    return matchesSearch && matchesFilter
  })

  const getBusinessTypeColor = (type: string) => {
    switch (type) {
      case 'BANK': return 'bg-blue-100 text-blue-800'
      case 'NBFC': return 'bg-green-100 text-green-800'
      case 'FINANCIAL_SERVICES': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <AdminLayout currentPage="Organizations">
      <div className="space-y-6">
        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statistics.total_organizations}</div>
                <p className="text-xs text-muted-foreground">All organizations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Organizations</CardTitle>
                <Building2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{statistics.active_organizations}</div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Banks</CardTitle>
                <Building2 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {statistics.business_type_breakdown.find(b => b.business_type === 'BANK')?.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">Bank organizations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">NBFCs</CardTitle>
                <Building2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {statistics.business_type_breakdown.find(b => b.business_type === 'NBFC')?.count || 0}
                </div>
                <p className="text-xs text-muted-foreground">NBFC organizations</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-40">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="bank">Banks</option>
              <option value="nbfc">NBFCs</option>
            </Select>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Organization</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Organization Name</Label>
                    <Input
                      id="name"
                      value={orgFormData.name}
                      onChange={(e) => setOrgFormData({...orgFormData, name: e.target.value})}
                      placeholder="Enter organization name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="display_name">Display Name</Label>
                    <Input
                      id="display_name"
                      value={orgFormData.display_name}
                      onChange={(e) => setOrgFormData({...orgFormData, display_name: e.target.value})}
                      placeholder="Enter display name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={orgFormData.email}
                      onChange={(e) => setOrgFormData({...orgFormData, email: e.target.value})}
                      placeholder="Enter email"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={orgFormData.phone}
                      onChange={(e) => setOrgFormData({...orgFormData, phone: e.target.value})}
                      placeholder="Enter phone"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="business_type">Business Type</Label>
                    <Select 
                      value={orgFormData.business_type} 
                      onChange={(e) => setOrgFormData({...orgFormData, business_type: e.target.value as 'BANK' | 'NBFC' | 'FINANCIAL_SERVICES' | 'OTHER'})}
                    >
                      <option value="BANK">Bank</option>
                      <option value="NBFC">NBFC</option>
                      <option value="FINANCIAL_SERVICES">Financial Services</option>
                      <option value="OTHER">Other</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="max_employees">Max Employees</Label>
                    <Input
                      id="max_employees"
                      type="number"
                      value={orgFormData.max_employees}
                      onChange={(e) => setOrgFormData({...orgFormData, max_employees: parseInt(e.target.value)})}
                      placeholder="50"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="tat_hours_limit">TAT Hours Limit</Label>
                  <Input
                    id="tat_hours_limit"
                    type="number"
                    value={orgFormData.tat_hours_limit}
                    onChange={(e) => setOrgFormData({...orgFormData, tat_hours_limit: parseInt(e.target.value)})}
                    placeholder="24"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Address</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="Address"
                      value={orgFormData.address_data.address}
                      onChange={(e) => setOrgFormData({
                        ...orgFormData, 
                        address_data: {...orgFormData.address_data, address: e.target.value}
                      })}
                    />
                    <Input
                      placeholder="City"
                      value={orgFormData.address_data.city}
                      onChange={(e) => setOrgFormData({
                        ...orgFormData, 
                        address_data: {...orgFormData.address_data, city: e.target.value}
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      placeholder="State"
                      value={orgFormData.address_data.state}
                      onChange={(e) => setOrgFormData({
                        ...orgFormData, 
                        address_data: {...orgFormData.address_data, state: e.target.value}
                      })}
                    />
                    <Input
                      placeholder="Pincode"
                      value={orgFormData.address_data.pincode}
                      onChange={(e) => setOrgFormData({
                        ...orgFormData, 
                        address_data: {...orgFormData.address_data, pincode: e.target.value}
                      })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrganization}>
                    Create Organization
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Organizations List */}
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading organizations...</div>
              </div>
            ) : filteredOrganizations.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No organizations found</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrganizations.map((org) => (
                  <div key={org.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{org.display_name}</h3>
                          <Badge className={getBusinessTypeColor(org.business_type)}>
                            {org.business_type}
                          </Badge>
                          <Badge variant={org.is_active ? "default" : "secondary"}>
                            {org.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Email:</span> {org.email}
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span> {org.phone}
                          </div>
                          <div>
                            <span className="font-medium">Max Employees:</span> {org.max_employees}
                          </div>
                          <div>
                            <span className="font-medium">TAT Limit:</span> {org.tat_hours_limit}h
                          </div>
                        </div>

                        {org.address_data && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Address:</span> {
                              `${org.address_data.address}, ${org.address_data.city}, ${org.address_data.state} - ${org.address_data.pincode}`
                            }
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewUsers(org)}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          Users
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteOrganization(org)}
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

        {/* Admin Creation Dialog */}
        <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedOrganization ? `Create Admin for ${selectedOrganization.display_name}` : 'Create Admin'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="admin_email">Email</Label>
                <Input
                  id="admin_email"
                  type="email"
                  value={adminFormData.email}
                  onChange={(e) => setAdminFormData({...adminFormData, email: e.target.value})}
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <Label htmlFor="admin_password">Password</Label>
                <Input
                  id="admin_password"
                  type="password"
                  value={adminFormData.password}
                  onChange={(e) => setAdminFormData({...adminFormData, password: e.target.value})}
                  placeholder="Enter password"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="admin_first_name">First Name</Label>
                  <Input
                    id="admin_first_name"
                    value={adminFormData.first_name}
                    onChange={(e) => setAdminFormData({...adminFormData, first_name: e.target.value})}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <Label htmlFor="admin_last_name">Last Name</Label>
                  <Input
                    id="admin_last_name"
                    value={adminFormData.last_name}
                    onChange={(e) => setAdminFormData({...adminFormData, last_name: e.target.value})}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="admin_phone">Phone</Label>
                <Input
                  id="admin_phone"
                  value={adminFormData.phone}
                  onChange={(e) => setAdminFormData({...adminFormData, phone: e.target.value})}
                  placeholder="Phone number"
                />
              </div>

              {/* Organization Users List */}
              {organizationUsers.length > 0 && (
                <div>
                  <Label>Current Users</Label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                    {organizationUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between py-1">
                        <div>
                          <span className="font-medium">{user.first_name} {user.last_name}</span>
                          <span className="text-sm text-gray-500 ml-2">({user.email})</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAdminDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAdmin}>
                  Create Admin
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
} 