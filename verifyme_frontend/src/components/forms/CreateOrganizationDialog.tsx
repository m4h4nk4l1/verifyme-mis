'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Organization } from '@/types'
import { Loader2 } from 'lucide-react'

const organizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  display_name: z.string().min(1, 'Display name is required'),
  email: z.string().email('Invalid email address'),
  business_type: z.enum(['bank', 'nbfc', 'financial_services', 'other']),
  max_employees: z.number().min(1, 'Must have at least 1 employee').max(10000, 'Maximum 10,000 employees'),
})

type OrganizationFormData = z.infer<typeof organizationSchema>

interface CreateOrganizationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Partial<Organization>) => Promise<void>
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateOrganizationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      business_type: 'other',
      max_employees: 100,
    },
  })

  const handleFormSubmit = async (data: OrganizationFormData) => {
    try {
      setIsSubmitting(true)
      await onSubmit(data)
      reset()
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating organization:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogDescription>
            Add a new organization to the system. Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Organization Name *
              </label>
              <Input
                id="name"
                placeholder="Enter organization name"
                {...register('name')}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="display_name" className="text-sm font-medium">
                Display Name *
              </label>
              <Input
                id="display_name"
                placeholder="Enter display name"
                {...register('display_name')}
                className={errors.display_name ? 'border-red-500' : ''}
              />
              {errors.display_name && (
                <p className="text-sm text-red-500">{errors.display_name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address *
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="business_type" className="text-sm font-medium">
                Business Type *
              </label>
              <select
                id="business_type"
                {...register('business_type')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bank">Bank</option>
                <option value="nbfc">NBFC</option>
                <option value="financial_services">Financial Services</option>
                <option value="other">Other</option>
              </select>
              {errors.business_type && (
                <p className="text-sm text-red-500">{errors.business_type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="max_employees" className="text-sm font-medium">
                Max Employees *
              </label>
              <Input
                id="max_employees"
                type="number"
                placeholder="100"
                {...register('max_employees', { valueAsNumber: true })}
                className={errors.max_employees ? 'border-red-500' : ''}
              />
              {errors.max_employees && (
                <p className="text-sm text-red-500">{errors.max_employees.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Organization'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 