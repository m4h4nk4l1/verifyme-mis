'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  Shield
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface SuperAdminNavigationProps {
  children: React.ReactNode
}

export function SuperAdminNavigation({ children }: SuperAdminNavigationProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth() as { user: any; logout: () => void }
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/superadmin/dashboard',
      icon: LayoutDashboard,
      description: 'Overview and statistics'
    },
    {
      name: 'Organizations',
      href: '/superadmin/organizations',
      icon: Building2,
      description: 'Manage organizations'
    },
    {
      name: 'Users',
      href: '/superadmin/users',
      icon: Users,
      description: 'Manage all users'
    },
    {
      name: 'Analytics',
      href: '/superadmin/analytics',
      icon: BarChart3,
      description: 'System-wide analytics'
    }
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-purple-600" />
              <h1 className="text-xl font-bold text-gray-900">VerifyMe</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`flex items-center space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isActive 
                      ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      isActive ? 'text-purple-600' : 'text-gray-500'
                    }`} />
                    <div>
                      <div className={`font-medium ${
                        isActive ? 'text-purple-900' : 'text-gray-900'
                      }`}>
                        {item.name}
                      </div>
                      <div className={`text-xs ${
                        isActive ? 'text-purple-700' : 'text-gray-500'
                      }`}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {user?.first_name} {user?.last_name}
                </div>
                <div className="text-xs text-gray-500">Super Admin</div>
              </div>
            </div>
            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {navigationItems.find(item => item.href === pathname)?.name || 'Dashboard'}
                </h2>
                <p className="text-sm text-gray-500">
                  {navigationItems.find(item => item.href === pathname)?.description || 'System management'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                <Shield className="h-4 w-4" />
                <span>Super Admin Panel</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  )
} 