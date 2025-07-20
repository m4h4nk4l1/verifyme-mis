'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  userType?: 'super-admin' | 'admin' | 'employee'
  onSuccess?: () => void
}

export function LoginForm({ userType = 'admin', onSuccess }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, isLoading } = useAuth()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null)
      await login(data)
      if (onSuccess) {
        onSuccess()
      } else {
        if (userType === 'super-admin') {
          router.push('/superadmin/dashboard')
        } else if (userType === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/employee/dashboard')
        }
      }
    } catch (err: unknown) {
      console.error('Login error:', err)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Login failed. Please try again.')
      }
    }
  }

  // Get styling based on user type
  const getStyling = () => {
    switch (userType) {
      case 'super-admin':
        return {
          bgGradient: 'from-purple-100 to-purple-300',
          cardBorder: 'border-purple-200',
          titleColor: 'text-purple-900',
          descriptionColor: 'text-purple-700',
          buttonBg: 'bg-purple-600 hover:bg-purple-700',
          labelColor: 'text-purple-900',
          helpTextColor: 'text-purple-700'
        }
      case 'admin':
        return {
          bgGradient: 'from-blue-100 to-blue-300',
          cardBorder: 'border-blue-200',
          titleColor: 'text-blue-900',
          descriptionColor: 'text-blue-700',
          buttonBg: 'bg-blue-600 hover:bg-blue-700',
          labelColor: 'text-blue-900',
          helpTextColor: 'text-blue-700'
        }
      case 'employee':
        return {
          bgGradient: 'from-green-100 to-green-300',
          cardBorder: 'border-green-200',
          titleColor: 'text-green-900',
          descriptionColor: 'text-green-700',
          buttonBg: 'bg-green-600 hover:bg-green-700',
          labelColor: 'text-green-900',
          helpTextColor: 'text-green-700'
        }
      default:
        return {
          bgGradient: 'from-blue-100 to-blue-300',
          cardBorder: 'border-blue-200',
          titleColor: 'text-blue-900',
          descriptionColor: 'text-blue-700',
          buttonBg: 'bg-blue-600 hover:bg-blue-700',
          labelColor: 'text-blue-900',
          helpTextColor: 'text-blue-700'
        }
    }
  }

  const styling = getStyling()

  const getUserTypeDisplayName = () => {
    switch (userType) {
      case 'super-admin':
        return 'Super Admin'
      case 'admin':
        return 'Admin'
      case 'employee':
        return 'Employee'
      default:
        return 'Admin'
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${styling.bgGradient} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-md w-full space-y-8">
        {/* Back to Home Button */}
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className={`${styling.descriptionColor} hover:bg-white/20`}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
        
        <Card className={`rounded-2xl border ${styling.cardBorder} bg-white shadow-2xl p-10`}>
          <CardHeader className="text-center mb-6 p-0">
            <CardTitle className={`text-3xl font-extrabold ${styling.titleColor}`}>
              {getUserTypeDisplayName()} Login
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your account
            </CardDescription>
            <p className={`mt-2 text-sm ${styling.descriptionColor}`}>
              Sign in to your {getUserTypeDisplayName().toLowerCase()} account
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2 text-left">
                <label htmlFor="email" className={`text-sm font-medium ${styling.labelColor}`}>
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2 text-left">
                <label htmlFor="password" className={`text-sm font-medium ${styling.labelColor}`}>
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    {...register('password')}
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className={`w-full h-11 text-base font-semibold rounded-lg ${styling.buttonBg} text-white shadow-md transition-colors duration-200`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className={`text-sm ${styling.helpTextColor}`}>
                Need help? Contact your administrator
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 