'use client'

import React, { useEffect, useState } from 'react'
import { SuperAdminNavigation } from '@/components/dashboard/SuperAdminNavigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Activity, Search, Filter, Download, Eye } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

export default function SuperAdminLogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getAuditLogs()
      setLogs(response.results || response || [])
    } catch (error) {
      console.error('Error fetching logs:', error)
      toast.error('Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log: any) =>
    log.user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800'
      case 'update':
        return 'bg-blue-100 text-blue-800'
      case 'delete':
        return 'bg-red-100 text-red-800'
      case 'login':
        return 'bg-purple-100 text-purple-800'
      case 'logout':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <SuperAdminNavigation>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
            <p className="text-gray-600">Monitor system activity and user actions</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </Button>
            <Button className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Logs List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-gray-600">Loading logs...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log: any) => (
              <Card key={log.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Activity className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {log.user?.first_name} {log.user?.last_name}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {log.details}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No logs found</p>
          </div>
        )}
      </div>
    </SuperAdminNavigation>
  )
} 