'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { AdvancedFilters, FormEntryFilters } from './AdvancedFilters';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  RefreshCw,
  Eye,
  Edit,
  CheckCircle,
  Calendar,
  X,
  FileText as FileTextIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api';
import { FormEntry, FormEntryStatistics } from '@/types/api';
import { toast } from 'sonner';

interface EmployeeDashboardProps {
  className?: string;
}

// Modal components
const ViewModal = ({ entry, onClose }: { entry: FormEntry, onClose: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Entry Details</h2>
        <Button variant="ghost" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-2">Basic Information</h3>
          <div className="space-y-2">
            <div><strong>Entry ID:</strong> {entry.entry_id || 'N/A'}</div>
            <div><strong>Case ID:</strong> {entry.case_id || 'N/A'}</div>
            <div><strong>Status:</strong> 
              <Badge className={`ml-2 ${entry.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {entry.status || 'pending'}
              </Badge>
            </div>
            <div><strong>Created:</strong> {format(new Date(entry.created_at), 'dd MMM yyyy HH:mm')}</div>
            <div><strong>Employee:</strong> {entry.employee_name || 'N/A'}</div>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Form Data</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {entry.form_data && Object.entries(entry.form_data).map(([key, value]) => (
              <div key={key} className="border-b pb-2">
                <div className="font-medium text-sm text-gray-600">{key.replace(/_/g, ' ').toUpperCase()}</div>
                <div className="text-sm">{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const EditModal = ({ entry, schema, onSave, onClose }: { 
  entry: FormEntry, 
  schema: Record<string, unknown>, 
  onSave: (data: Record<string, unknown>) => void,
  onClose: () => void 
}) => {
  const [formData, setFormData] = useState<Record<string, unknown>>(entry.form_data || {});
  
  const handleSave = () => {
    onSave(formData);
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Entry</h2>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          {(schema?.fields_definition as Array<Record<string, unknown>>)?.map((field: Record<string, unknown>) => (
            <div key={field.name as string}>
              <Label htmlFor={field.name as string}>{field.display_name as string || field.name as string}</Label>
              <Input
                id={field.name as string}
                value={formData[field.name as string] as string || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, [field.name as string]: e.target.value }))}
                className="mt-1"
              />
            </div>
          ))}
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
};

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ className }) => {
  const router = useRouter();
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // State management
  const [formEntries, setFormEntries] = useState<FormEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [schemaFields, setSchemaFields] = useState<string[]>([]);
  const [caseCounts, setCaseCounts] = useState<{
    total: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  }>({ total: 0, thisWeek: 0, thisMonth: 0, thisYear: 0 });

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<FormEntry | null>(null);
  const [selectedSchema, setSelectedSchema] = useState<Record<string, unknown> | null>(null);

  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<FormEntryFilters>({});
  const [filters, setFilters] = useState({
    status: '',
    dateFrom: '',
    dateTo: '',
    employee: '',
    caseType: ''
  });

  // Count feature
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Date range options
  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'last_90_days', label: 'Last 90 Days' },
    { value: 'custom', label: 'Custom Range' },
  ];

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const pageSize = 20;

  // Statistics state
  const [formStatistics, setFormStatistics] = useState<FormEntryStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // File handling state
  const [fileInfo, setFileInfo] = useState<Record<string, unknown>>({});
  const [failedFileIds, setFailedFileIds] = useState<Set<string>>(new Set());
  const [exportLoading, setExportLoading] = useState(false);


  // Simple data loading function
  const loadData = async (search?: string, filterParams?: Record<string, unknown>) => {
    try {
      setEntriesLoading(true);
      
      // Check if we have advanced filters
      const hasAdvancedFilters = filterParams && Object.keys(filterParams).length > 0;
      
      let response;
      if (hasAdvancedFilters) {
        // Use advanced filtering endpoint
        response = await apiClient.advancedFilterEntries({
          search: search || searchTerm,
          ...filterParams
        });
      } else {
        // Use basic filtering
        response = await apiClient.getFormEntries({
          search: search || searchTerm,
          ...(filterParams || filters)
        });
      }
      
      setFormEntries(response.results || response);
      
      // Extract field names from the actual schema, not from form data
      if (response.results && response.results.length > 0) {
        // Get the first entry's schema to determine the actual schema fields
        const firstEntry = response.results[0];
        if (firstEntry.form_schema_details && typeof firstEntry.form_schema_details === 'object') {
          const schema = firstEntry.form_schema_details as Record<string, unknown>;
          if (schema.fields_definition && Array.isArray(schema.fields_definition)) {
            const schemaFields = (schema.fields_definition as Array<Record<string, unknown>>)
              .map((field: Record<string, unknown>) => field.name as string).sort();
            console.log('Extracted schema fields:', schemaFields);
            setSchemaFields(schemaFields);
          } else {
            // Fallback: extract from form data but filter out common test fields
            const allFields = new Set<string>();
            response.results.forEach((entry: FormEntry) => {
              if (entry.form_data) {
                Object.keys(entry.form_data).forEach(field => {
                  // Filter out test fields and common unwanted fields
                  if (!field.includes('test') && 
                      !field.includes('Test') && 
                      field !== 'case_type' && 
                      field !== 'customer_name' && 
                      field !== 'location' && 
                      field !== 'agency_id') {
                    allFields.add(field);
                  }
                });
              }
            });
            const sortedFields = Array.from(allFields).sort();
            setSchemaFields(sortedFields);
          }
        }
      }
      
      // Show warnings if any
      if (response.warnings && response.warnings.length > 0) {
        response.warnings.forEach((warning: string) => {
          toast.warning(warning);
        });
      }
      
      // Update counts with current filters
      if (hasAdvancedFilters) {
        loadCaseCountsWithFilters(filterParams);
      } else {
        loadCaseCounts();
      }
    } catch (error) {
      console.error('Error fetching form entries:', error);
      toast.error('Failed to load data');
    } finally {
      setEntriesLoading(false);
    }
  };

  // Load case counts with current filters
  const loadCaseCounts = async () => {
    try {
      const response = await apiClient.getCaseCounts({
        search: searchTerm,
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        employee: filters.employee,
        caseType: filters.caseType
      });
      setCaseCounts(response);
    } catch (error) {
      console.error('Error fetching case counts:', error);
    }
  };

  // Load case counts with specific filters
  const loadCaseCountsWithFilters = async (filterParams?: Record<string, unknown>) => {
    try {
      const response = await apiClient.getCaseCounts({
        search: searchTerm,
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        employee: filters.employee,
        caseType: filters.caseType,
        ...filterParams // Include advanced filters
      });
      setCaseCounts(response);
    } catch (error) {
      console.error('Error fetching case counts:', error);
    }
  };

  // Statistics functions
  const fetchStatistics = async () => {
    try {
      setStatsLoading(true)
      const [formStats] = await Promise.all([
        apiClient.getFormEntryStatistics()
      ])
      setFormStatistics(formStats)
      // setOrgStatistics(orgStats) // Removed as per edit hint
    } catch (error) {
      console.error('Error fetching statistics:', error)
      toast.error('Failed to load statistics')
    } finally {
      setStatsLoading(false)
    }
  }

  const refreshStatistics = async () => {
    await fetchStatistics()
  }

  // Enhanced data loading with pagination
  const fetchFormEntries = async () => {
    try {
      setEntriesLoading(true)
      
      // Always use advanced filtering endpoint for consistency and proper pagination
      const apiFilters: Record<string, unknown> = {}
      
      // Convert advanced filters to API format
      if (advancedFilters.dateRange) apiFilters.date_range = advancedFilters.dateRange
      if (advancedFilters.status) apiFilters.status = advancedFilters.status
      if (advancedFilters.startDate) apiFilters.start_date = advancedFilters.startDate
      if (advancedFilters.endDate) apiFilters.end_date = advancedFilters.endDate
      if (advancedFilters.employee) apiFilters.employee_name = advancedFilters.employee
      if (advancedFilters.bankNbfc) apiFilters.bank_nbfc_name = advancedFilters.bankNbfc
      if (advancedFilters.location) apiFilters.location = advancedFilters.location
      if (advancedFilters.productType) apiFilters.product_type = advancedFilters.productType
      if (advancedFilters.caseStatus) apiFilters.case_status = advancedFilters.caseStatus
      if (advancedFilters.isRepeatCase !== undefined) apiFilters.is_repeat_case = advancedFilters.isRepeatCase
      if (advancedFilters.isOutOfTat !== undefined) apiFilters.is_out_of_tat = advancedFilters.isOutOfTat
      if (advancedFilters.fieldVerifier) apiFilters.field_verifier_name = advancedFilters.fieldVerifier
      if (advancedFilters.backOfficeExecutive) apiFilters.back_office_executive_name = advancedFilters.backOfficeExecutive
      if (advancedFilters.search) apiFilters.search = advancedFilters.search
      
      // Add pagination parameters to the request body
      apiFilters.page = currentPage
      apiFilters.page_size = pageSize
      
      console.log('🔍 PAGINATION DEBUG:')
      console.log('   - Current page:', currentPage)
      console.log('   - Page size:', pageSize)
      console.log('   - API filters being sent:', apiFilters)
      
      const response = await apiClient.advancedFilterEntries(apiFilters)
      
      console.log('🔍 API response:', response)
      console.log('   - Response has results:', !!response.results)
      console.log('   - Results count:', response.results?.length || 0)
      console.log('   - Total count:', response.count)
      console.log('   - Next page:', response.next)
      console.log('   - Previous page:', response.previous)
      
      // Handle paginated response
      if (response.results) {
        setFormEntries(response.results)
        setTotalEntries(response.count || response.results.length)
        const calculatedPages = Math.ceil((response.count || response.results.length) / pageSize)
        setTotalPages(calculatedPages)
        console.log('🔍 Set pagination state:')
        console.log('   - Form entries count:', response.results.length)
        console.log('   - Total entries:', response.count)
        console.log('   - Total pages:', calculatedPages)
      } else {
        // Fallback for non-paginated response
        setFormEntries(response || [])
        setTotalEntries((response || []).length)
        setTotalPages(1)
        console.log('🔍 Fallback - non-paginated response')
      }
      
      // Handle warnings from backend
      if (response.warnings && response.warnings.length > 0) {
        response.warnings.forEach((warning: string) => {
          toast.warning(warning, {
            duration: 5000,
            description: 'Some filters were ignored because the fields are not available in your schema.'
          })
        })
      }
    } catch (error) {
      console.error('Error fetching form entries:', error)
      
      // Show specific error messages
      if (error instanceof Error) {
        toast.error(error.message, {
          duration: 8000,
          description: 'Please try again or contact support if the issue persists.'
        })
      } else {
        toast.error('Failed to load form entries. Please try again.')
      }
    } finally {
      setEntriesLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchStatistics()
    fetchFormEntries()
  }, [])

  // Update useEffect to depend on both advancedFilters and currentPage
  useEffect(() => {
    fetchFormEntries();
  }, [advancedFilters, currentPage]);

  // Handle advanced filters changes separately
  useEffect(() => {
    console.log('🔍 Advanced filters changed, resetting to page 1')
    setCurrentPage(1)
    fetchFormEntries()
  }, [advancedFilters])

  // Update schema fields when form entries change - improved
  useEffect(() => {
    if (formEntries.length > 0) {
      const fieldNames = getAllFieldNames()
      console.log('Schema fields detected:', fieldNames)
      setSchemaFields(fieldNames)
    }
  }, [formEntries])

  // Debounced search and filter effect - removed duplicate fetchFormEntries call
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only update counts when filters change, don't fetch entries again
      loadCaseCounts()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, filters, advancedFilters])

  // Handle search with debouncing
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    
    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce the search to avoid too many API calls
    searchTimeoutRef.current = setTimeout(() => {
      // Update advancedFilters to include search term
      setAdvancedFilters(prev => ({
        ...prev,
        search: value
      }));
    }, 500); // 500ms delay
  };

  // Handle advanced filter changes
  const handleAdvancedFiltersChange = (newFilters: FormEntryFilters) => {
    setAdvancedFilters(newFilters)
    
    // Reset to first page when filters change
    setCurrentPage(1)
    
    // Convert advanced filters to API format
    const apiFilters: Record<string, unknown> = {}
    
    if (newFilters.dateRange) apiFilters.date_range = newFilters.dateRange
    if (newFilters.startDate) apiFilters.start_date = newFilters.startDate
    if (newFilters.endDate) apiFilters.end_date = newFilters.endDate
    if (newFilters.month) apiFilters.month = newFilters.month
    if (newFilters.year) apiFilters.year = newFilters.year
    if (newFilters.bankNbfc) apiFilters.bank_nbfc_name = newFilters.bankNbfc
    if (newFilters.location) apiFilters.location = newFilters.location
    if (newFilters.productType) apiFilters.product_type = newFilters.productType
    if (newFilters.caseStatus) apiFilters.case_status = newFilters.caseStatus
    if (newFilters.isRepeatCase !== undefined) apiFilters.is_repeat_case = newFilters.isRepeatCase
    if (newFilters.isOutOfTat !== undefined) apiFilters.is_out_of_tat = newFilters.isOutOfTat
    if (newFilters.fieldVerifier) apiFilters.field_verifier_name = newFilters.fieldVerifier
    if (newFilters.backOfficeExecutive) apiFilters.back_office_executive_name = newFilters.backOfficeExecutive
    if (newFilters.search) apiFilters.search = newFilters.search
    if (newFilters.employee) apiFilters.employee_name = newFilters.employee
    if (newFilters.status) apiFilters.status = newFilters.status
    
    console.log('Advanced filters changed:', apiFilters)
  }

  // Fetch file information for a file ID
  const fetchFileInfo = async (fileId: string) => {
    // Skip if fileId is not a valid UUID format
    if (!fileId || typeof fileId !== 'string' || fileId.length !== 36) {
      console.warn('Invalid file ID format:', fileId);
      return null;
    }
    
    // Check if we've already tried to fetch this file and failed
    if (failedFileIds.has(fileId)) {
      return null;
    }
    
    // Check if already cached
    if (fileInfo[fileId]) return fileInfo[fileId];
    
    try {
      const fileData = await apiClient.getFormFieldFile(fileId);
      if (fileData && fileData.file_url) {
        setFileInfo(prev => ({ ...prev, [fileId]: fileData }));
        return fileData;
      } else {
        console.warn('File data missing or invalid for ID:', fileId);
        setFailedFileIds(prev => new Set([...prev, fileId]));
        return null;
      }
    } catch (error) {
      console.warn('Failed to fetch file info for ID:', fileId, error);
      setFailedFileIds(prev => new Set([...prev, fileId]));
      return null;
    }
  }

  // Get field value with file handling
  const getFieldValue = (entry: FormEntry, fieldName: string) => {
    // Use filtered_form_data if available, otherwise fall back to form_data
    const dataToUse = entry.filtered_form_data || entry.form_data;
    const value = dataToUse?.[fieldName];
    
    if (value === undefined || value === null) return 'N/A';
    
    // Handle file fields - check if it's a file ID (UUID format)
    if (typeof value === 'string' && value.length === 36 && value.includes('-')) {
      // Check if it's a file ID
      const file = fileInfo[value];
      if (file && typeof file === 'object' && 'file_url' in file) {
        return (
          <a 
            href={(file as { file_url: string }).file_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            📎 {(file as { original_filename?: string }).original_filename || 'View File'}
          </a>
        );
      } else {
        // Fetch file info if not cached
        fetchFileInfo(value);
        return '📎 Loading...';
      }
    }
    
    // Handle S3 URLs directly
    if (typeof value === 'string' && value.startsWith('http')) {
      // Check if it's a URL (S3 file link) - improved detection
      if (value.includes('s3.amazonaws.com') || 
          value.includes('verifyme-mis-files') ||
          value.includes('amazonaws.com')) {
        return (
          <a 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            📎 View File
          </a>
        );
      }
      return value;
    }
    
    // Handle regular values
    if (typeof value === 'string') {
      return value;
    }
    
    if (typeof value === 'number') {
      return value.toString();
    }
    
    if (typeof value === 'object') {
      // Handle file fields
      if (value && typeof value === 'object' && 'file_url' in value) {
        return (
          <a 
            href={(value as { file_url: string }).file_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            📎 {(value as { original_filename?: string }).original_filename || 'View File'}
          </a>
        );
      }
      return JSON.stringify(value);
    }
    
    return String(value);
  }

  // Get all field names from form entries - improved to remove duplicates and filter properly
  const getAllFieldNames = () => {
    const fieldNames = new Set<string>();
    
    formEntries.forEach(entry => {
      // Use filtered_form_data if available, otherwise fall back to form_data
      const dataToUse = entry.filtered_form_data || entry.form_data;
      
      if (dataToUse) {
        Object.keys(dataToUse).forEach(key => {
          // Only add valid schema fields, exclude system fields
          if (key && typeof key === 'string' && key.trim() !== '') {
            // Filter out common system fields that shouldn't be displayed
            const systemFields = ['id', 'created_at', 'updated_at', 'employee_id', 'organization_id', 'form_schema_id'];
            if (!systemFields.includes(key)) {
              fieldNames.add(key);
            }
          }
        });
      }
    });
    
    // Convert to array and sort for consistent ordering
    return Array.from(fieldNames).sort();
  }

  // Load data on component mount
  useEffect(() => {
    fetchStatistics()
    fetchFormEntries()
  }, [])

  useEffect(() => {
    fetchFormEntries()
  }, [currentPage, advancedFilters])

  // Update schema fields when form entries change - improved
  useEffect(() => {
    if (formEntries.length > 0) {
      const fieldNames = getAllFieldNames()
      console.log('Schema fields detected:', fieldNames)
      setSchemaFields(fieldNames)
    }
  }, [formEntries])

  // Debounced search and filter effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchFormEntries()
      // Update counts when filters change
      loadCaseCounts()
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, filters, advancedFilters])

  // Handle filter changes


  // Clear filters
  const clearFilters = () => {
    setFilters({
      status: '',
      dateFrom: '',
      dateTo: '',
      employee: '',
      caseType: ''
    });
  };

  // Handle view entry details
  const handleViewEntry = async (entry: FormEntry) => {
    try {
      const response = await apiClient.viewEntryDetails(entry.id);
      setSelectedEntry(entry);
      setSelectedSchema(response.schema);
      setShowViewModal(true);
    } catch (error) {
      console.error('Error fetching entry details:', error);
    }
  };

  // Handle edit entry
  const handleEditEntry = async (entry: FormEntry) => {
    try {
      const response = await apiClient.viewEntryDetails(entry.id);
      setSelectedEntry(entry);
      setSelectedSchema(response.schema);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error fetching entry details:', error);
    }
  };

  // Handle save edit
  const handleSaveEdit = async (formData: Record<string, unknown>) => {
    if (!selectedEntry) return;
    
    try {
      await apiClient.updateFormEntry(selectedEntry.id, { form_data: formData });
      setShowEditModal(false);
      loadData();
      toast.success('Entry updated successfully!');
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Failed to update entry. Please try again.');
    }
  };

  // Handle status change
  const handleStatusChange = async (entry: FormEntry, newStatus: string) => {
    try {
      await apiClient.updateEntryStatus(entry.id, newStatus);
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Download entry
  const downloadEntry = async (entryId: string) => {
    try {
      const response = await apiClient.downloadEntry(entryId);
      const url = window.URL.createObjectURL(new Blob([response]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `entry-${entryId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading entry:', error);
    }
  };

  // Export functions with date filtering
  const exportAsCSV = async () => {
    try {
      setExportLoading(true);
      const blob = await apiClient.exportData({
        format: 'csv',
        filters: {
          date_range: dateRange,
          custom_start_date: customStartDate,
          custom_end_date: customEndDate,
          form_schema: selectedSchema?.id,
          search: searchTerm || undefined,
        },
        options: {
          include_files: true,
          include_attachments: true,
        }
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cases-entered-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExportLoading(false);
    }
  };

  const exportAsExcel = async () => {
    try {
      setExportLoading(true);
      const blob = await apiClient.exportData({
        format: 'excel',
        filters: {
          date_range: dateRange,
          custom_start_date: customStartDate,
          custom_end_date: customEndDate,
          form_schema: selectedSchema?.id,
          search: searchTerm || undefined,
        },
        options: {
          include_files: true,
          include_attachments: true,
        }
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cases-entered-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Excel exported successfully');
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const exportAsPDF = async () => {
    try {
      setExportLoading(true);
      const blob = await apiClient.exportData({
        format: 'pdf',
        filters: {
          date_range: dateRange,
          custom_start_date: customStartDate,
          custom_end_date: customEndDate,
          form_schema: selectedSchema?.id,
          search: searchTerm || undefined,
        },
        options: {
          include_files: true,
          include_attachments: true,
        }
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cases-entered-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExportLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch {
      return dateString;
    }
  };

  // Handle CREATE NEW button
  const handleCreateNew = () => {
    router.push('/employee/form-entry');
  };
  
  // Debug logging
  console.log('Current schemaFields:', schemaFields);
  
  // Get field value safely


  return (
    <div className={`space-y-6 p-4 sm:p-6 lg:p-8 overflow-x-hidden max-w-full ${className}`}>
      {/* Statistics Cards - Enhanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-full">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold text-blue-900">Total Cases</CardTitle>
            <FileTextIcon className="h-6 w-6 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                formStatistics?.total_entries || caseCounts.total || 0
              )}
            </div>
            <p className="text-sm text-blue-700 font-medium">All time entries</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold text-green-900">Completed</CardTitle>
            <CheckCircle className="h-6 w-6 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                formStatistics?.completed_entries || 0
              )}
            </div>
            <p className="text-sm text-green-700 font-medium">Successfully completed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold text-yellow-900">This Week</CardTitle>
            <Calendar className="h-6 w-6 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                caseCounts.thisWeek || 0
              )}
            </div>
            <p className="text-sm text-yellow-700 font-medium">New cases this week</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-bold text-purple-900">This Month</CardTitle>
            <FileTextIcon className="h-6 w-6 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {statsLoading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                caseCounts.thisMonth || 0
              )}
            </div>
            <p className="text-sm text-purple-700 font-medium">Monthly activity</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters Section - Enhanced */}
      <Card className="bg-gradient-to-r from-gray-50 to-white border-gray-200 max-w-full">
        <CardHeader>
          <div className="flex items-center justify-between max-w-full">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl font-bold text-gray-900">Case Management</CardTitle>
              <CardDescription className="text-gray-600">
                Search, filter, and manage your form entries
              </CardDescription>
            </div>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex-shrink-0"
              onClick={handleCreateNew}
            >
              <Plus className="w-4 h-4 mr-2" />
              CREATE NEW
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 max-w-full">
          {/* Search Bar */}
          <div className="flex items-center space-x-4 max-w-full">
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search for category, name, company, etc."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-12 text-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 w-full"
              />
            </div>
            
            <Button 
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 border-gray-300 hover:bg-gray-50 flex-shrink-0"
            >
              <Filter className="w-4 h-4" />
              Advanced Filters
            </Button>
          </div>

          {/* Export Controls */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200 max-w-full">
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Label htmlFor="date-range" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                Export Period:
              </Label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="flex h-10 items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {dateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              {dateRange === 'custom' && (
                <div className="flex items-center space-x-2">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-gray-500">to</span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-32"
                  />
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Button 
                variant="outline"
                onClick={exportAsCSV}
                disabled={exportLoading}
                className="flex items-center space-x-2"
              >
                {exportLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                Export CSV
              </Button>
              
              <Button 
                variant="outline"
                onClick={exportAsExcel}
                disabled={exportLoading}
                className="flex items-center space-x-2"
              >
                {exportLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                Export Excel
              </Button>
              
              <Button 
                variant="outline"
                onClick={exportAsPDF}
                disabled={exportLoading}
                className="flex items-center space-x-2"
              >
                {exportLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Export PDF
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="pt-4 border-t border-gray-200 max-w-full">
              <AdvancedFilters
                filters={advancedFilters}
                onFiltersChange={handleAdvancedFiltersChange}
                onClearFilters={() => {
                  setAdvancedFilters({});
                  clearFilters();
                  fetchFormEntries();
                }}
                isLoading={entriesLoading}
                schemaFields={schemaFields}
                warnings={[]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Table Section */}
      <Card className="bg-white shadow-lg border-gray-200 max-w-full overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between max-w-full">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl font-bold text-gray-900">Cases Entered</CardTitle>
              <CardDescription className="text-gray-600">
                Manage and track your form entries with advanced filtering
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-4 flex-shrink-0">
              <div className="text-sm text-gray-600 font-medium whitespace-nowrap">
                Total: {totalEntries} entries
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={refreshStatistics}
                disabled={statsLoading}
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="max-w-full overflow-hidden">
          {/* Enhanced Table */}
          {entriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-lg font-medium text-gray-700">Loading entries...</span>
              </div>
            </div>
          ) : formEntries.length === 0 ? (
            <div className="text-center py-12">
              <FileTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No entries found</h3>
              <p className="text-gray-500">
                {Object.keys(advancedFilters).some(key => advancedFilters[key as keyof typeof advancedFilters]) 
                  ? 'Try adjusting your filters or search terms'
                  : 'Get started by creating your first form entry'
                }
              </p>
            </div>
          ) : (
            <div className="w-full max-w-full">
              <div className="border border-gray-200 rounded-lg overflow-hidden max-w-full">
                <div className="max-h-[600px] overflow-y-auto max-w-full">
                  <div className="overflow-x-auto w-full max-w-full">
                    <div className="min-w-full inline-block align-middle max-w-full">
                      <Table className="w-full max-w-full">
                        <TableHeader className="sticky top-0 bg-white z-10">
                          <TableRow className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                            <TableHead className="text-left py-4 px-4 font-semibold text-gray-700 text-sm bg-white whitespace-nowrap">
                              <input type="checkbox" className="rounded border-gray-300" />
                            </TableHead>
                            <TableHead className="text-left py-4 px-4 font-semibold text-gray-700 text-sm bg-white whitespace-nowrap">ENTRY ID</TableHead>
                            <TableHead className="text-left py-4 px-4 font-semibold text-gray-700 text-sm bg-white whitespace-nowrap">DATE</TableHead>
                            <TableHead className="text-left py-4 px-4 font-semibold text-gray-700 text-sm bg-white whitespace-nowrap">STATUS</TableHead>
                            <TableHead className="text-left py-4 px-4 font-semibold text-gray-700 text-sm bg-white whitespace-nowrap">EMPLOYEE</TableHead>
                            {/* Dynamic schema fields */}
                            {schemaFields.map((field) => (
                              <TableHead key={field} className="text-left py-4 px-4 font-semibold text-gray-700 text-sm whitespace-nowrap bg-white">
                                {field.toUpperCase().replace(/_/g, ' ')}
                              </TableHead>
                            ))}
                            <TableHead className="text-left py-4 px-4 font-semibold text-gray-700 text-sm bg-white whitespace-nowrap">ACTIONS</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {formEntries.map((entry, index) => {
                            // Calculate TAT duration
                            const tatStartTime = new Date(entry.tat_start_time);
                            const tatCompletionTime = entry.tat_completion_time ? new Date(entry.tat_completion_time) : new Date();
                            const tatDurationHours = (tatCompletionTime.getTime() - tatStartTime.getTime()) / (1000 * 60 * 60);
                            
                            const tatLimit = 24; // Default TAT limit
                            const isOutOfTat = tatDurationHours > tatLimit;
                            
                            const formData = entry.filtered_form_data || entry.form_data || {};
                            
                            // Get field value safely
                            const getFieldValue = (fieldName: string) => {
                              const value = formData[fieldName];
                              if (value === undefined || value === null) return 'N/A';
                              if (typeof value === 'string') {
                                // Check if it's a URL (S3 file link) - improved detection
                                if (value.startsWith('http') && (
                                  value.includes('s3.amazonaws.com') || 
                                  value.includes('verifyme-mis-files') ||
                                  value.includes('amazonaws.com')
                                )) {
                                  return (
                                    <a 
                                      href={value} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline text-xs"
                                    >
                                      📎 View File
                                    </a>
                                  );
                                }
                                return value;
                              }
                              if (typeof value === 'number') {
                                return value.toString();
                              }
                              if (typeof value === 'object') {
                                // Handle file fields
                                if (value && typeof value === 'object' && 'file_url' in value) {
                                  return (
                                    <a 
                                      href={(value as { file_url: string }).file_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline text-xs"
                                    >
                                      📎 {(value as { original_filename?: string }).original_filename || 'View File'}
                                    </a>
                                  );
                                }
                                return JSON.stringify(value);
                              }
                              return String(value);
                            };
                            
                            return (
                              <TableRow key={entry.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                isOutOfTat && (entry.status === 'pending' || entry.status === 'completed')
                                  ? 'bg-red-50 hover:bg-red-100' 
                                  : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}>
                                <TableCell className="py-4 px-4 whitespace-nowrap">
                                  <input type="checkbox" className="rounded border-gray-300" />
                                </TableCell>
                                <TableCell className="py-4 px-4 font-medium text-blue-600 whitespace-nowrap">
                                  <div className="font-medium text-gray-900">
                                    {entry.entry_id ?? 'N/A'}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 px-4 text-sm text-gray-600 whitespace-nowrap">
                                  {entry.created_at ? formatDate(entry.created_at) : 'N/A'}
                                </TableCell>
                                <TableCell className="py-4 px-4 whitespace-nowrap">
                                  <Badge 
                                    variant={entry.status === 'completed' ? 'default' : 'secondary'}
                                    className={`capitalize text-xs ${
                                      isOutOfTat && (entry.status === 'pending' || entry.status === 'completed')
                                        ? 'bg-red-100 text-red-800 border-red-200' 
                                        : ''
                                    }`}
                                  >
                                    {entry.status || 'pending'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-4 px-4 whitespace-nowrap">
                                  <div>
                                    <p className="font-medium text-sm">
                                      {entry.employee?.first_name && entry.employee?.last_name 
                                        ? `${entry.employee.first_name} ${entry.employee.last_name}`
                                        : entry.employee?.username || 'N/A'
                                      }
                                    </p>
                                    <p className="text-xs text-gray-500">{entry.employee?.email || 'N/A'}</p>
                                  </div>
                                </TableCell>
                                {/* Dynamic schema field values */}
                                {schemaFields.map((field) => (
                                  <TableCell key={field} className="py-4 px-4">
                                    <div className="max-w-xs truncate" title={field}>
                                      {getFieldValue(field)}
                                    </div>
                                  </TableCell>
                                ))}
                                <TableCell className="py-4 px-4 whitespace-nowrap">
                                  <div className="flex items-center space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => downloadEntry(entry.id)}
                                      title="Download"
                                      className="h-8 w-8 p-0 hover:bg-blue-50"
                                    >
                                      <Download className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewEntry(entry)}
                                      title="View Details"
                                      className="h-8 w-8 p-0 hover:bg-green-50"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditEntry(entry)}
                                      title="Edit Entry"
                                      className="h-8 w-8 p-0 hover:bg-yellow-50"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleStatusChange(entry, entry.status === 'completed' ? 'pending' : 'completed')}
                                      title="Change Status"
                                      className={`h-8 w-8 p-0 ${
                                        entry.status === 'completed' 
                                          ? 'text-green-600 hover:bg-green-50' 
                                          : 'text-yellow-600 hover:bg-yellow-50'
                                      }`}
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-lg font-semibold text-gray-700">
                {entriesLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading entries...
                  </span>
                ) : (
                  `Showing ${((currentPage - 1) * pageSize) + 1} to ${Math.min(currentPage * pageSize, totalEntries)} of ${totalEntries} entries`
                )}
              </div>
              <Pagination>
                <PaginationContent className="gap-2">
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => !entriesLoading && setCurrentPage(Math.max(1, currentPage - 1))}
                      className={`px-4 py-2 text-lg font-semibold ${
                        currentPage === 1 || entriesLoading
                          ? 'pointer-events-none opacity-50 bg-gray-100' 
                          : 'cursor-pointer hover:bg-blue-100'
                      }`}
                    />
                  </PaginationItem>
                  
                  {/* Generate page numbers */}
                  {(() => {
                    const pages = [];
                    const totalPagesToShow = 7;
                    
                    if (totalPages <= totalPagesToShow) {
                      // Show all pages
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      // Show first 5 + ellipsis + last page for early pages
                      if (currentPage <= 5) {
                        for (let i = 1; i <= 5; i++) {
                          pages.push(i);
                        }
                        pages.push('...');
                        pages.push(totalPages);
                      }
                      // Show first page + ellipsis + last 5 for late pages
                      else if (currentPage >= totalPages - 4) {
                        pages.push(1);
                        pages.push('...');
                        for (let i = totalPages - 4; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      }
                      // Show first + ellipsis + current±1 + ellipsis + last for middle pages
                      else {
                        pages.push(1);
                        pages.push('...');
                        pages.push(currentPage - 1);
                        pages.push(currentPage);
                        pages.push(currentPage + 1);
                        pages.push('...');
                        pages.push(totalPages);
                      }
                    }
                    
                    return pages.map((page, index) => (
                      <PaginationItem key={index}>
                        {page === '...' ? (
                          <span className="px-4 py-2 text-gray-500">...</span>
                        ) : (
                          <PaginationLink
                            onClick={() => !entriesLoading && setCurrentPage(page as number)}
                            isActive={currentPage === page}
                            className={`px-4 py-2 text-lg font-semibold ${
                              entriesLoading 
                                ? 'pointer-events-none opacity-50' 
                                : currentPage === page 
                                  ? 'bg-blue-600 text-white' 
                                  : 'cursor-pointer hover:bg-blue-100'
                            }`}
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ));
                  })()}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => !entriesLoading && setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={`px-4 py-2 text-lg font-semibold ${
                        currentPage === totalPages || entriesLoading
                          ? 'pointer-events-none opacity-50 bg-gray-100' 
                          : 'cursor-pointer hover:bg-blue-100'
                      }`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showViewModal && selectedEntry && (
        <ViewModal 
          entry={selectedEntry} 
          onClose={() => setShowViewModal(false)} 
        />
      )}

      {showEditModal && selectedEntry && selectedSchema && (
        <EditModal 
          entry={selectedEntry} 
          schema={selectedSchema} 
          onSave={handleSaveEdit}
          onClose={() => setShowEditModal(false)} 
        />
      )}
    </div>
  );
};

export default EmployeeDashboard; 