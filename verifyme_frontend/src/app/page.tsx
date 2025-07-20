'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Lock, Shield, Users, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

type LoginType = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE'

export default function LoginPage() {
  const { user, login, isLoading } = useAuth()
  const router = useRouter()
  const [selectedLoginType, setSelectedLoginType] = useState<LoginType | null>(null)
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  })
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !isLoading) {
      const targetPath = (() => {
        switch (user.role) {
          case 'SUPER_ADMIN':
            return '/superadmin/dashboard'
          case 'ADMIN':
            return '/admin/dashboard'
          case 'EMPLOYEE':
            return '/employee/dashboard'
          default:
            return '/employee/dashboard'
        }
      })()

      // Only redirect if not already on the target path
      if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
        router.push(targetPath)
      }
    }
  }, [user, isLoading, router])

  const handleLoginTypeSelect = (loginType: LoginType) => {
    setSelectedLoginType(loginType)
    setCredentials({ email: '', password: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLoginType) return

    setIsLoggingIn(true)

    try {
      await login(credentials)
      toast.success('Login successful!')
      // The useEffect above will handle the redirect
    } catch (error) {
      console.error('Login error:', error)
      toast.error('Login failed. Please check your credentials.')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleBackToSelection = () => {
    setSelectedLoginType(null)
    setCredentials({ email: '', password: '' })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            VerifyMe
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Management Information System
          </p>
        </div>

        {!selectedLoginType ? (
          // Login Type Selection
          <div className="space-y-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleLoginTypeSelect('SUPER_ADMIN')}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <Shield className="h-8 w-8 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Super Admin Login</h3>
                    <p className="text-sm text-gray-600">System-wide management and control</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleLoginTypeSelect('ADMIN')}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Admin Login</h3>
                    <p className="text-sm text-gray-600">Organization-level management</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleLoginTypeSelect('EMPLOYEE')}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <UserCheck className="h-8 w-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Employee Login</h3>
                    <p className="text-sm text-gray-600">Form entry and data management</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Login Form
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  {selectedLoginType === 'SUPER_ADMIN' && <Shield className="h-5 w-5 text-red-600" />}
                  {selectedLoginType === 'ADMIN' && <Users className="h-5 w-5 text-blue-600" />}
                  {selectedLoginType === 'EMPLOYEE' && <UserCheck className="h-5 w-5 text-green-600" />}
                  <span>
                    {selectedLoginType === 'SUPER_ADMIN' && 'Super Admin Login'}
                    {selectedLoginType === 'ADMIN' && 'Admin Login'}
                    {selectedLoginType === 'EMPLOYEE' && 'Employee Login'}
                  </span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToSelection}
                >
                  Back
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="email">Email address</Label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={credentials.email}
                      onChange={handleInputChange}
                      className="pl-10"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={credentials.password}
                      onChange={handleInputChange}
                      className="pl-10"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing in...
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Contact your administrator for login credentials
          </p>
        </div>
      </div>
    </div>
  )
}
