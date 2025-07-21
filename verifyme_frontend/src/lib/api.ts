import axios from 'axios';

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increased timeout to 60 seconds
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Unified API Client
export const apiClient = {
  // Auth methods
  login: async (credentials: { email: string; password: string }) => {
    const response = await api.post('/accounts/api/token/', credentials);
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/accounts/api/logout/');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    return response.data;
  },
  
  refresh: async (refresh_token: string) => {
    const response = await api.post('/accounts/api/token/refresh/', { refresh: refresh_token });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/accounts/api/users/profile/');
    return response.data;
  },
  
  updateProfile: async (data: Record<string, unknown>) => {
    const response = await api.put('/accounts/api/users/profile/', data);
    return response.data;
  },

  // Organizations
  getOrganizations: async (params?: Record<string, unknown>) => {
    const response = await api.get('/accounts/api/organizations/', { 
      params: params || {} 
    });
    return response.data;
  },

  createOrganization: async (data: Record<string, unknown>) => {
    const response = await api.post('/accounts/api/organizations/', data);
    return response.data;
  },

  updateOrganization: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/accounts/api/organizations/${id}/`, data);
    return response.data;
  },

  deleteOrganization: async (id: string) => {
    const response = await api.delete(`/accounts/api/organizations/${id}/`);
    return response.data;
  },

  getOrganizationStatistics: async () => {
    const response = await api.get('/accounts/api/organizations/statistics/');
    return response.data;
  },

  getOrganizationUsers: async (orgId: string) => {
    const response = await api.get(`/accounts/api/organizations/${orgId}/employees/`);
    return response.data;
  },

  createOrganizationAdmin: async (orgId: string, data: Record<string, unknown>) => {
    const response = await api.post(`/accounts/api/organizations/${orgId}/admin/`, data);
    return response.data;
  },

  // Users
  getUsers: async (params?: Record<string, unknown>) => {
    const response = await api.get('/accounts/api/users/', { 
      params: params || {} 
    });
    return response.data;
  },

  createUser: async (data: Record<string, unknown>) => {
    const response = await api.post('/accounts/api/users/', data);
    return response.data;
  },

  updateUser: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/accounts/api/users/${id}/`, data);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await api.delete(`/accounts/api/users/${id}/`);
    return response.data;
  },

  // Employees
  getEmployees: async (orgId?: string) => {
    const params = orgId ? { organization: orgId } : {};
    const response = await api.get('/accounts/api/users/employees/', { params });
    return response.data;
  },

  createEmployee: async (data: Record<string, unknown>) => {
    try {
      console.log('🔍 Creating employee with data:', data);
      const response = await api.post('/accounts/api/users/create-employee/', data);
      console.log('🔍 Employee created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating employee:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: unknown, status?: number } }
        console.error('❌ Response status:', errorResponse.response?.status);
        console.error('❌ Response data:', errorResponse.response?.data);
        
        if (errorResponse.response?.status === 400) {
          const errorData = errorResponse.response.data as Record<string, unknown>;
          if (errorData && typeof errorData === 'object') {
            // Return validation errors in a structured format
            throw new Error(JSON.stringify(errorData));
          }
        }
      }
      throw error;
    }
  },

  updateEmployee: async (id: string, data: Record<string, unknown>) => {
    try {
      console.log('🔍 Updating employee with data:', data);
      const response = await api.patch(`/accounts/api/users/${id}/update-employee/`, data);
      console.log('🔍 Employee updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: unknown, status?: number } }
        console.error('❌ Response status:', errorResponse.response?.status);
        console.error('❌ Response data:', errorResponse.response?.data);
        
        if (errorResponse.response?.status === 400) {
          const errorData = errorResponse.response.data as Record<string, unknown>;
          if (errorData && typeof errorData === 'object') {
            throw new Error(JSON.stringify(errorData));
          }
        }
      }
      throw error;
    }
  },

  deleteEmployee: async (id: string) => {
    try {
      console.log('🔍 Deleting employee:', id);
      const response = await api.delete(`/accounts/api/users/${id}/delete-employee/`);
      console.log('🔍 Employee deleted successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting employee:', error);
      throw error;
    }
  },

  getRealTimeAnalytics: async () => {
    const response = await api.get('/accounts/api/users/real-time-analytics/');
    return response.data;
  },

  getEmployeeAnalytics: async () => {
    const response = await api.get('/logs/api/logs/employee-analytics/');
    return response.data;
  },

  getAuditLogs: async (params?: Record<string, unknown>) => {
    const response = await api.get('/accounts/api/users/audit-logs/', { 
      params: params || {} 
    });
    return response.data;
  },

  // Form Schemas
  getFormSchemas: async (params?: Record<string, unknown> | string) => {
    try {
      let requestParams: Record<string, unknown> = {};
      
      if (typeof params === 'string') {
        // If params is a string (like organizationId), convert it to an object
        requestParams = { organization: params };
      } else if (params && typeof params === 'object') {
        // If params is already an object, use it
        requestParams = params;
      }
      
      // Ensure requestParams is always a valid object
      if (!requestParams || typeof requestParams !== 'object') {
        requestParams = {};
      }
      
      // Test the connection first
      try {
        await api.get('/accounts/api/users/profile/');
      } catch {
        throw new Error('Backend server is not accessible. Please ensure the Django server is running.');
      }
      
      const response = await api.get('/forms/api/schemas/', { 
        params: requestParams
      });
      return response.data;
    } catch (error) {
      console.error('getFormSchemas error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        response: error && typeof error === 'object' && 'response' in error ? (error as { response: unknown }).response : undefined,
        request: error && typeof error === 'object' && 'request' in error ? (error as { request: unknown }).request : undefined
      });
      throw error;
    }
  },

  getFormSchema: async (id: string) => {
    const response = await api.get(`/forms/api/schemas/${id}/`);
    return response.data;
  },

  createFormSchema: async (data: Record<string, unknown>) => {
    const response = await api.post('/forms/api/schemas/', data);
    return response.data;
  },

  updateFormSchema: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/forms/api/schemas/${id}/`, data);
    return response.data;
  },

  deleteFormSchema: async (id: string) => {
    const response = await api.delete(`/forms/api/schemas/${id}/`);
    return response.data;
  },

  // Form Entries
  getFormEntries: async (params?: Record<string, unknown>) => {
    try {
      const response = await api.get('/forms/api/entries/', { 
        params: params || {} 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching form entries:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        response: error && typeof error === 'object' && 'response' in error ? (error as { response: unknown }).response : undefined,
        request: error && typeof error === 'object' && 'request' in error ? (error as { request: unknown }).request : undefined
      });
      throw error;
    }
  },

  // Advanced filtering for form entries
  advancedFilterEntries: async (filters: Record<string, unknown>) => {
    try {
      console.log('🔍 Sending advanced filter request with data:', { filters })
      const response = await api.post('/forms/api/entries/advanced-filter/', filters);
      console.log('🔍 Received advanced filter response:', response.data)
      return response.data;
    } catch (error) {
      console.error('Error applying advanced filters:', error);
      
      // Handle timeout specifically
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. The server is taking too long to respond. Please try again or contact support if the issue persists.');
      }
      
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: unknown, status?: number } }
        console.error('❌ Response status:', errorResponse.response?.status)
        console.error('❌ Response data:', errorResponse.response?.data)
        
        if (errorResponse.response?.status === 500) {
          throw new Error('Server error. Please try again later or contact support.');
        } else if (errorResponse.response?.status === 400) {
          throw new Error('Invalid request. Please check your filter parameters.');
        }
      }
      
      throw new Error('Failed to load form entries. Please try again.');
    }
  },

  createFormEntry: async (data: Record<string, unknown>) => {
    try {
      const response = await api.post('/forms/api/entries/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating form entry:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        response: error && typeof error === 'object' && 'response' in error ? (error as { response: unknown }).response : undefined,
        request: error && typeof error === 'object' && 'request' in error ? (error as { request: unknown }).request : undefined
      });
      throw error;
    }
  },

  updateFormEntry: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/forms/api/entries/${id}/`, data);
    return response.data;
  },

  deleteFormEntry: async (id: string) => {
    const response = await api.delete(`/forms/api/entries/${id}/`);
    return response.data;
  },

  completeFormEntry: async (id: string) => {
    const response = await api.post(`/forms/api/entries/${id}/complete/`);
    return response.data;
  },

  verifyFormEntry: async (id: string, data: Record<string, unknown>) => {
    const response = await api.post(`/forms/api/entries/${id}/verify/`, data);
    return response.data;
  },

  getFormEntryStatistics: async (params?: Record<string, unknown>) => {
    const response = await api.get('/forms/api/entries/statistics/', { 
      params: params || {} 
    });
    return response.data;
  },

  // Employee Dashboard Actions
  viewEntryDetails: async (entryId: string) => {
    const response = await api.get(`/forms/api/entries/${entryId}/view-details/`);
    return response.data;
  },

  updateEntryStatus: async (entryId: string, status: string, notes?: string) => {
    const response = await api.put(`/forms/api/entries/${entryId}/update-status/`, {
      status,
      verification_notes: notes
    });
    return response.data;
  },

  downloadEntry: async (entryId: string) => {
    const response = await api.get(`/forms/api/entries/${entryId}/download/`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Date range count
  getDateRangeCount: async (params: Record<string, unknown>) => {
    const response = await api.get('/forms/api/entries/date-range-count/', { 
      params: params || {} 
    });
    return response.data;
  },

  // Get case counts
  getCaseCounts: async (params?: Record<string, unknown>) => {
    const response = await api.get('/forms/api/entries/counts/', { 
      params: params || {} 
    });
    return response.data;
  },

  // File Upload
  uploadFile: async (entryId: string, file: File, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('form_entry', entryId);
    if (description) {
      formData.append('description', description);
    }
    const response = await api.post('/forms/api/files/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Form Field Files
  getFormFieldFiles: async (params?: Record<string, unknown>) => {
    const response = await api.get('/forms/api/field-files/', { 
      params: params || {} 
    });
    return response.data;
  },

  getFormFieldFile: async (id: string) => {
    const response = await api.get(`/forms/api/field-files/${id}/`);
    
    // Log S3 URL details for debugging
    if (response.data && response.data.file_url) {
      console.log(`🌐 S3 URL for file ${id}: ${response.data.file_url}`);
    } else {
      console.log(`⚠️ No file_url found in response for file ${id}`);
    }
    
    return response.data;
  },

  uploadFormFieldFile: async (entryId: string, fieldName: string, file: File, description?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('form_entry', entryId);
    formData.append('field_name', fieldName);
    formData.append('original_filename', file.name);
    formData.append('file_type', file.type);
    formData.append('file_size', file.size.toString());
    if (description) {
      formData.append('description', description);
    }
    
    try {
      const response = await api.post('/forms/api/field-files/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ File upload failed!')
      console.error('❌ Error:', error)
      console.error('❌ Error type:', typeof error)
      
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: unknown, status?: number, headers?: unknown } }
        console.error('❌ Response status:', errorResponse.response?.status)
        console.error('❌ Response data:', errorResponse.response?.data)
        console.error('❌ Response headers:', errorResponse.response?.headers)
      }
      
      if (error && typeof error === 'object' && 'request' in error) {
        const errorRequest = error as { request?: unknown }
        console.error('❌ Request details:', errorRequest.request)
      }
      
      throw error;
    }
  },

  updateFormFieldFile: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/forms/api/field-files/${id}/`, data);
    return response.data;
  },

  deleteFormFieldFile: async (id: string) => {
    const response = await api.delete(`/forms/api/field-files/${id}/`);
    return response.data;
  },

  verifyFormFieldFile: async (id: string, data: Record<string, unknown>) => {
    const response = await api.post(`/forms/api/field-files/${id}/verify/`, data);
    return response.data;
  },

  // Export
  exportData: async (data: Record<string, unknown>) => {
    const response = await api.post('/forms/api/export/', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Enhanced export functionality with date range filtering
  enhancedExportData: async (exportData: {
    format: 'excel' | 'pdf' | 'csv'
    filters: {
      date_range?: 'all' | 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom'
      custom_start_date?: string
      custom_end_date?: string
      case_id_from?: number
      case_id_to?: number
      form_schema?: string
      status?: 'pending' | 'completed' | 'verified'
      search?: string
      bank_nbfc_name?: string
      location?: string
      product_type?: string
      case_status?: string
    }
    options?: {
      include_attachments?: boolean
      include_form_data?: boolean
      include_summary?: boolean
    }
  }) => {
    try {
      console.log('🔍 Sending enhanced export request:', exportData)
      const response = await api.post('/forms/api/export-enhanced/', exportData, {
        responseType: 'blob',
        timeout: 60000 // 60 seconds timeout for large exports
      })
      
      console.log('🔍 Enhanced export response received:', response)
      
      // Create download link
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0]
      const format = exportData.format
      a.download = `form_entries_${timestamp}.${format}`
      
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      return { success: true, message: 'Export completed successfully' }
    } catch (error) {
      console.error('Error in enhanced export:', error)
      
      if (error && typeof error === 'object' && 'response' in error) {
        const errorResponse = error as { response?: { data?: unknown, status?: number } }
        
        if (errorResponse.response?.status === 400) {
          throw new Error('Invalid export parameters. Please check your filter settings.')
        } else if (errorResponse.response?.status === 500) {
          throw new Error('Server error during export. Please try again later.')
        }
      }
      
      throw new Error('Failed to export data. Please try again.')
    }
  },

  // Analytics
  getAnalytics: async (params?: Record<string, unknown>) => {
    const response = await api.get('/reports/api/analytics/', { 
      params: params || {} 
    });
    return response.data;
  },

  createAnalytics: async (data: Record<string, unknown>) => {
    const response = await api.post('/reports/api/analytics/', data);
    return response.data;
  },

  updateAnalytics: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/reports/api/analytics/${id}/`, data);
    return response.data;
  },

  deleteAnalytics: async (id: string) => {
    const response = await api.delete(`/reports/api/analytics/${id}/`);
    return response.data;
  },

  getAnalyticsStatistics: async () => {
    const response = await api.get('/reports/api/analytics/statistics/');
    return response.data;
  },

  generateAnalytics: async (data: Record<string, unknown>) => {
    const response = await api.post('/reports/api/analytics/generate/', data);
    return response.data;
  },

  // Reports
  getReports: async (params?: Record<string, unknown>) => {
    const response = await api.get('/reports/api/reports/', { 
      params: params || {} 
    });
    return response.data;
  },

  createReport: async (data: Record<string, unknown>) => {
    const response = await api.post('/reports/api/reports/', data);
    return response.data;
  },

  updateReport: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/reports/api/reports/${id}/`, data);
    return response.data;
  },

  deleteReport: async (id: string) => {
    const response = await api.delete(`/reports/api/reports/${id}/`);
    return response.data;
  },

  getReportStatistics: async () => {
    const response = await api.get('/reports/api/reports/statistics/');
    return response.data;
  },

  generateReport: async (id: string, data?: Record<string, unknown>) => {
    const response = await api.post(`/reports/api/reports/${id}/generate/`, data || {});
    return response.data;
  },

  // Dashboards
  getDashboards: async (params?: Record<string, unknown>) => {
    const response = await api.get('/reports/api/dashboards/', { 
      params: params || {} 
    });
    return response.data;
  },

  createDashboard: async (data: Record<string, unknown>) => {
    const response = await api.post('/reports/api/dashboards/', data);
    return response.data;
  },

  updateDashboard: async (id: string, data: Record<string, unknown>) => {
    const response = await api.put(`/reports/api/dashboards/${id}/`, data);
    return response.data;
  },

  deleteDashboard: async (id: string) => {
    const response = await api.delete(`/reports/api/dashboards/${id}/`);
    return response.data;
  },

  getDashboardStatistics: async () => {
    const response = await api.get('/reports/api/dashboards/statistics/');
    return response.data;
  },

  setDefaultDashboard: async (id: string) => {
    const response = await api.post(`/reports/api/dashboards/${id}/set-default/`);
    return response.data;
  },


};

// Export the axios instance for direct use if needed
export { api }; 