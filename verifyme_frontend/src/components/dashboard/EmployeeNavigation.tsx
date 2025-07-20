'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  FileText, 
  User, 
  LogOut,
  Plus
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface EmployeeNavigationProps {
  children: React.ReactNode
}

export function EmployeeNavigation({ children }: EmployeeNavigationProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth() as { user: any; logout: () => void }

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/employee/dashboard',
      icon: LayoutDashboard,
      description: 'View and manage your entries'
    },
    {
      name: 'Form Entry',
      href: '/employee/form-entry',
      icon: Plus,
      description: 'Create new form entries'
    },
    {
      name: 'My Forms',
      href: '/employee/forms',
      icon: FileText,
      description: 'View all your form entries'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                VerifyMe - Employee Portal
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {user?.first_name} {user?.last_name}
                </span>
              </div>
              
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Cards - Only show on dashboard page */}
        {pathname === '/employee/dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link key={item.href} href={item.href}>
                  <Card className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    isActive ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3">
                        <Icon className={`h-6 w-6 ${
                          isActive ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                        <div>
                          <h3 className={`font-semibold ${
                            isActive ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {item.name}
                          </h3>
                          <p className={`text-sm ${
                            isActive ? 'text-blue-700' : 'text-gray-600'
                          }`}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
        
        {/* Page Content */}
        <div className="bg-white rounded-lg shadow">
          {children}
        </div>
      </div>
    </div>
  )
} 