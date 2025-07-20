'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, User, LogIn, LogOut, UserPlus, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface EmployeeAnalyticsData {
  employees_created_total: number
  login_activities_total: number
  logout_activities_total: number
  unique_users_total: number
  total_activities_total: number
  recent_activities: Array<{
    id: string
    user: {
      first_name: string
      last_name: string
      email: string
    }
    user_name: string
    user_email: string
    action: string
    details: string
    timestamp: string
    ip_address: string
    organization: {
      name: string
    }
    organization_name: string
  }>
}

export function EmployeeAnalytics() {
  const [analytics, setAnalytics] = useState<EmployeeAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      const data = await apiClient.getEmployeeAnalytics()
      // Ensure recent_activities is always an array
      const safeData = {
        ...data,
        recent_activities: data.recent_activities || []
      }
      setAnalytics(safeData)
    } catch (error) {
      console.error('Error fetching employee analytics:', error)
      toast.error('Failed to load employee analytics')
      
      // Set empty data instead of mock data
      setAnalytics({
        employees_created_total: 0,
        login_activities_total: 0,
        logout_activities_total: 0,
        unique_users_total: 0,
        total_activities_total: 0,
        recent_activities: []
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const handleRefresh = async () => {
    await fetchAnalytics()
    toast.success('Analytics refreshed successfully')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'text-green-600 bg-green-50'
      case 'LOGOUT':
        return 'text-red-600 bg-red-50'
      case 'USER_CREATE':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <LogIn className="h-4 w-4" />
      case 'LOGOUT':
        return <LogOut className="h-4 w-4" />
      case 'USER_CREATE':
        return <UserPlus className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading employee analytics...</p>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Real-time Analytics</h3>
          <p className="text-sm text-gray-600">Live employee activity data</p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees Created</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{analytics.employees_created_total}</div>
            <p className="text-xs text-muted-foreground">Total employees created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Login Activities</CardTitle>
            <LogIn className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.login_activities_total}</div>
            <p className="text-xs text-muted-foreground">Total successful logins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Logout Activities</CardTitle>
            <LogOut className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.logout_activities_total}</div>
            <p className="text-xs text-muted-foreground">Total user logouts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <User className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{analytics.unique_users_total}</div>
            <p className="text-xs text-muted-foreground">Total unique users</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Employee Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!analytics?.recent_activities || analytics.recent_activities.length === 0) ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No recent activities</p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics.recent_activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${getActionColor(activity.action)}`}>
                      {getActionIcon(activity.action)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">
                          {activity.user_name || `${activity.user.first_name} ${activity.user.last_name}`}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getActionColor(activity.action)}`}>
                          {activity.action}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{activity.details}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatDate(activity.timestamp)}
                        </span>
                        <span className="text-xs text-gray-500">
                          IP: {activity.ip_address}
                        </span>
                        {(activity.organization_name || activity.organization?.name) && (
                          <span className="text-xs text-gray-500">
                            Org: {activity.organization_name || activity.organization?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 