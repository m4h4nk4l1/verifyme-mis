'use client'

import React, { useEffect, useState } from 'react'
import { SuperAdminNavigation } from '@/components/dashboard/SuperAdminNavigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BarChart3, Activity, Users, Building2, Search, RefreshCw, LogIn, LogOut, Clock } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface RealTimeAnalytics {
  organizations: {
    total: number
    active: number
    new_today: number
  }
  users: {
    total: number
    employees: number
    admins: number
    super_admins: number
    new_today: number
  }
  activities: {
    total_logins: number
    total_logouts: number
    logins_today: number
    logouts_today: number
  }
  recent_activities: Array<{
    id: string
    action: string
    user_name: string
    user_role: string
    organization_name: string
    timestamp: string
    ip_address: string
    details: string
  }>
  last_updated: string
}

export default function SuperAdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<RealTimeAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAnalytics()
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getRealTimeAnalytics()
      setAnalytics(response)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await fetchAnalytics()
    toast.success('Analytics refreshed successfully')
  }

  const filteredActivities = analytics?.recent_activities.filter(activity =>
    activity.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.action.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <LogIn className="h-4 w-4 text-green-600" />
      case 'LOGOUT':
        return <LogOut className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'bg-green-100 text-green-800'
      case 'LOGOUT':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <SuperAdminNavigation>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Real-Time Analytics</h1>
            <p className="text-gray-600">Live system statistics and activity monitoring</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              className="flex items-center space-x-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-gray-600">Loading analytics...</span>
          </div>
        ) : analytics ? (
          <>
            {/* Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.organizations.total}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.organizations.active} active • +{analytics.organizations.new_today} today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.users.employees}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.users.admins} admins • +{analytics.users.new_today} today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Logins</CardTitle>
                  <LogIn className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{analytics.activities.logins_today}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.activities.total_logins} total logins
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Logouts</CardTitle>
                  <LogOut className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{analytics.activities.logouts_today}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.activities.total_logouts} total logouts
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5" />
                    Recent Login/Logout Activity
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search activities..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredActivities.length > 0 ? (
                    filteredActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                        <div className="text-lg">{getActionIcon(activity.action)}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">
                              {activity.user_name}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${getActionColor(activity.action)}`}>
                              {activity.action}
                            </span>
                            <span className="text-xs text-gray-500">
                              {activity.user_role}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {activity.organization_name}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center space-x-2">
                            <Clock className="h-3 w-3" />
                            <span>{formatTimestamp(activity.timestamp)}</span>
                            {activity.ip_address && (
                              <span className="text-gray-400">• {activity.ip_address}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No activity found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Last Updated */}
            <div className="text-center text-sm text-gray-500">
              Last updated: {formatTimestamp(analytics.last_updated)}
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            Failed to load analytics data
          </div>
        )}
      </div>
    </SuperAdminNavigation>
  )
} 