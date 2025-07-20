"use client";
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SuperAdminNavigation } from "@/components/dashboard/SuperAdminNavigation";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  Users, 
  BarChart3, 
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError("");
      try {
        const res = await apiClient.getOrganizationStatistics();
        setStats(res);
      } catch {
        setError("Failed to load stats.");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <SuperAdminNavigation>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600">System-wide overview and management</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-2 text-gray-600">Loading statistics...</span>
          </div>
        ) : error ? (
          <div className="text-red-600 bg-red-50 p-4 rounded-lg">
            <AlertTriangle className="h-5 w-5 inline mr-2" />
            {error}
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.total_organizations || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    All registered organizations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Organizations</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.active_organizations || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Currently active organizations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    All registered users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Health</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Good</div>
                  <p className="text-xs text-muted-foreground">
                    All systems operational
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Business Type Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5" />
                    Business Types Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.business_type_breakdown?.map((bt: any) => (
                      <div key={bt.business_type} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{bt.business_type}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full" 
                              style={{ width: `${(bt.count / stats.total_organizations) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-bold">{bt.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    System Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Database Status</span>
                      <span className="text-sm text-green-600 font-medium">Connected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API Status</span>
                      <span className="text-sm text-green-600 font-medium">Operational</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Storage Status</span>
                      <span className="text-sm text-green-600 font-medium">Available</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    className="flex items-center space-x-2"
                    onClick={() => handleNavigation('/superadmin/organizations')}
                  >
                    <Building2 className="h-4 w-4" />
                    <span>Manage Organizations</span>
                  </Button>
                  <Button 
                    className="flex items-center space-x-2"
                    onClick={() => handleNavigation('/superadmin/users')}
                  >
                    <Users className="h-4 w-4" />
                    <span>Manage Users</span>
                  </Button>
                  <Button 
                    className="flex items-center space-x-2"
                    onClick={() => handleNavigation('/superadmin/analytics')}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>View Analytics</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </SuperAdminNavigation>
  );
} 