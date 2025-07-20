'use client'

import React, { useEffect, useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AdminLayout } from '@/components/dashboard/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Clock, User, LogIn, LogOut, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface AuditLog {
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
}

export default function LogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    totalLogs: 0,
    todayLogs: 0,
    activeUsers: 0,
    loginActions: 0
  })

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      
      // Fetch employee analytics from the API
      const response = await apiClient.getEmployeeAnalytics()
      
      // Extract recent activities from the response
      const recentActivities = response.recent_activities || []
      setLogs(recentActivities)
      
      // Use the analytics data for statistics
      setStats({
        totalLogs: response.total_activities_total || 0,
        todayLogs: response.login_activities_total + response.logout_activities_total || 0,
        activeUsers: response.unique_users_total || 0,
        loginActions: response.login_activities_total || 0
      })
      
    } catch (error) {
      console.error('Error fetching employee analytics:', error)
      toast.error('Failed to load employee analytics')
      
      // Set empty data instead of mock data
      setLogs([])
      setStats({
        totalLogs: 0,
        todayLogs: 0,
        activeUsers: 0,
        loginActions: 0
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    await fetchLogs()
    toast.success('Logs refreshed successfully')
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
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  return (
    <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
      <AdminLayout currentPage="Logs">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Activity Logs</h1>
              <p className="text-gray-600">Real-time login and logout activity for your organization&apos;s employees</p>
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

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalLogs}</div>
                <p className="text-xs text-muted-foreground">Login/Logout events</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today&apos;s Activities</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.todayLogs}</div>
                <p className="text-xs text-muted-foreground">Today&apos;s login/logout</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <User className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.activeUsers}</div>
                <p className="text-xs text-muted-foreground">Unique users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Login Events</CardTitle>
                <LogIn className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.loginActions}</div>
                <p className="text-xs text-muted-foreground">Successful logins</p>
              </CardContent>
            </Card>
          </div>

          {/* Logs List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Employee Activity</CardTitle>
              <CardDescription>
                Latest employee login and logout activities from the database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading activity logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No activity logs found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">
                              {log.user_name || `${log.user?.first_name || ''} ${log.user?.last_name || ''}`.trim()}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getActionColor(log.action)}`}>
                              {log.action}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{log.details}</p>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-500">
                              {formatDate(log.timestamp)}
                            </span>
                            <span className="text-xs text-gray-500">
                              IP: {log.ip_address}
                            </span>
                            {(log.organization_name || log.organization?.name) && (
                              <span className="text-xs text-gray-500">
                                Org: {log.organization_name || log.organization?.name}
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
      </AdminLayout>
    </ProtectedRoute>
  )
}
