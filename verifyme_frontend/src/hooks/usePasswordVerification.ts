'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface UsePasswordVerificationReturn {
  isVerifying: boolean
  verifyPassword: (password: string) => Promise<boolean>
  clearError: () => void
  error: string
}

export function usePasswordVerification(): UsePasswordVerificationReturn {
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')

  const verifyPassword = useCallback(async (password: string): Promise<boolean> => {
    if (!password.trim()) {
      setError('Password is required')
      return false
    }

    setIsVerifying(true)
    setError('')

    try {
      await apiClient.verifyPassword(password)
      toast.success('Password verified successfully')
      return true
    } catch (error) {
      console.error('Password verification failed:', error)
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: { error?: string }, status?: number } }
        if (errorResponse.response?.status === 401) {
          setError('Invalid password. Please try again.')
        } else {
          setError(errorResponse.response?.data?.error || 'Password verification failed')
        }
      } else {
        setError('Password verification failed. Please try again.')
      }
      return false
    } finally {
      setIsVerifying(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError('')
  }, [])

  return {
    isVerifying,
    verifyPassword,
    clearError,
    error
  }
}