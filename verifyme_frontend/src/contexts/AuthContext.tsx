'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, LoginCredentials } from '@/types'
import { apiClient } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  const clearAuthData = () => {
    setUser(null)
    setIsLoading(false)
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  }

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user data and token exist in localStorage
        const userData = localStorage.getItem('user')
        const accessToken = localStorage.getItem('access_token')
        
        if (userData && accessToken) {
          const parsedUser = JSON.parse(userData)
          setUser(parsedUser)
          
          // Only verify token if we have one
          try {
            const currentUser = await apiClient.getCurrentUser()
            setUser(currentUser)
            localStorage.setItem('user', JSON.stringify(currentUser))
          } catch {
            // Token is invalid, clear auth without redirect
            clearAuthData()
          }
        } else {
          // No token or user data, just set loading to false
          clearAuthData()
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        clearAuthData()
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true)
      const response = await apiClient.login(credentials)
      setUser(response.user)
      localStorage.setItem('user', JSON.stringify(response.user))
      localStorage.setItem('access_token', response.access)
      localStorage.setItem('refresh_token', response.refresh)
      // No redirect - let the frontend handle routing based on user role
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearAuthData()
      // Only redirect if we're not already on the login page
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/'
      }
    }
  }

  const refreshUser = async () => {
    try {
      const currentUser = await apiClient.getCurrentUser()
      setUser(currentUser)
      localStorage.setItem('user', JSON.stringify(currentUser))
    } catch (error) {
      console.error('Refresh user error:', error)
      clearAuthData()
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 