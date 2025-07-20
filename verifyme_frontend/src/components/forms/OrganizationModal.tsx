'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'

interface OrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  organization?: any
  onSuccess: () => void
}

export function OrganizationModal({ isOpen, onClose, organization, onSuccess }: OrganizationModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    email: '',
    phone: '',
    business_type: '',
    is_active: true,
    // Admin user fields
    admin_email: '',
    admin_username: '',
    admin_first_name: '',
    admin_last_name: '',
    admin_password: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        display_name: organization.display_name || '',
        email: organization.email || '',
        phone: organization.phone || '',
        business_type: organization.business_type || '',
        is_active: organization.is_active ?? true,
        // Admin fields not needed for editing
        admin_email: '',
        admin_username: '',
        admin_first_name: '',
        admin_last_name: '',
        admin_password: ''
      })
    } else {
      setFormData({
        name: '',
        display_name: '',
        email: '',
        phone: '',
        business_type: '',
        is_active: true,
        admin_email: '',
        admin_username: '',
        admin_first_name: '',
        admin_last_name: '',
        admin_password: ''
      })
    }
  }, [organization])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (organization) {
        // For editing, only send organization fields
        const { admin_email, admin_username, admin_first_name, admin_last_name, admin_password, ...orgData } = formData
        await apiClient.updateOrganization(organization.id, orgData)
        toast.success('Organization updated successfully')
      } else {
        // For creating, send all fields including admin data
        await apiClient.createOrganization(formData)
        toast.success('Organization created successfully')
      }
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error saving organization:', error)
      toast.error(organization ? 'Failed to update organization' : 'Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  const businessTypes = [
    'BANK',
    'NBFC',
    'FINANCIAL_SERVICES',
    'OTHER'
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {organization ? 'Edit Organization' : 'Add New Organization'}
          </DialogTitle>
          <DialogDescription>
            {organization ? 'Update organization information' : 'Create a new organization with admin user'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Organization Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter organization name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name *</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="Enter display name"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="business_type">Business Type *</Label>
              <Select
                value={formData.business_type}
                onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
              >
                <option value="">Select business type</option>
                {businessTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>

          {/* Admin User Information - Only show when creating new organization */}
          {!organization && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-medium">Admin User Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin_first_name">Admin First Name *</Label>
                  <Input
                    id="admin_first_name"
                    value={formData.admin_first_name}
                    onChange={(e) => setFormData({ ...formData, admin_first_name: e.target.value })}
                    placeholder="Enter admin first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin_last_name">Admin Last Name *</Label>
                  <Input
                    id="admin_last_name"
                    value={formData.admin_last_name}
                    onChange={(e) => setFormData({ ...formData, admin_last_name: e.target.value })}
                    placeholder="Enter admin last name"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="admin_email">Admin Email *</Label>
                  <Input
                    id="admin_email"
                    type="email"
                    value={formData.admin_email}
                    onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                    placeholder="Enter admin email"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin_username">Admin Username *</Label>
                  <Input
                    id="admin_username"
                    value={formData.admin_username}
                    onChange={(e) => setFormData({ ...formData, admin_username: e.target.value })}
                    placeholder="Enter admin username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin_password">Admin Password *</Label>
                <Input
                  id="admin_password"
                  type="password"
                  value={formData.admin_password}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  placeholder="Enter admin password"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (organization ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 