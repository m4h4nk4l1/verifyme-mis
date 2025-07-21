// User and Authentication Types
export interface User {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE'
  organization: string
  organization_name: string
  is_active: boolean
  is_email_verified: boolean
  date_joined: string
  created_at: string
  updated_at: string
  employee_data?: Record<string, unknown>
  phone?: string
  // Password fields for employee creation
  password?: string
  confirm_password?: string
}

export interface Organization {
  id: string
  name: string
  display_name: string
  email: string
  phone: string
  address_data: Record<string, unknown>
  business_type: 'BANK' | 'NBFC' | 'FINANCIAL_SERVICES' | 'OTHER'
  is_active: boolean
  max_employees: number
  tat_hours_limit: number
  created_at: string
  updated_at: string
}

// Form Schema Types
export interface FormField {
  id: string
  name: string
  display_name: string
  field_type: 'NUMERIC' | 'STRING' | 'ALPHANUMERIC' | 'SYMBOLS_ALPHANUMERIC' | 'BOOLEAN' | 'DATE' | 'EMAIL' | 'PHONE' | 'IMAGE_UPLOAD' | 'DOCUMENT_UPLOAD'
  validation_rules: Record<string, unknown>
  is_required: boolean
  is_unique: boolean
  default_value?: string
  help_text?: string
  order: number
  is_active: boolean
  organization: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface FormSchema {
  id: string
  name: string
  description: string
  organization: string
  fields_definition: FormField[]
  max_fields: number
  tat_hours_limit: number
  is_active: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

// Form Entry Types with Filtering Fields
export interface FormEntry {
  id: string
  entry_id: number // Unique per org, auto-increment
  case_id: number // Grouping field, not unique
  display_case_id?: number
  organization: string
  employee: User
  form_schema: string
  form_schema_details?: FormSchema // Added for admin dashboard
  form_data: Record<string, unknown>
  filtered_form_data?: Record<string, unknown>
  is_completed: boolean
  is_verified: boolean
  verification_notes?: string
  tat_start_time: string
  tat_completion_time?: string
  verified_by?: User
  verified_at?: string
  created_at: string
  updated_at: string
  
  // Additional filtering fields from form_data
  case_status?: 'Positive' | 'Negative' | 'Profile Decline' | 'Pending'
  product_type?: string // e.g., 'Auto', 'Home', etc.
  location?: 'Maharashtra' | 'Goa'
  bank_nbfc_name?: string
  field_verifier_name?: string
  back_office_executive_name?: string
  is_repeat_case?: boolean
  is_out_of_tat?: boolean
  
  // EmployeeDashboard specific properties
  employee_name?: string
  employee_email?: string
  case_type?: string
  status?: string
}

// Filter Types
export interface FormEntryFilters {
  // Date filters
  dateRange?: 'today' | 'week' | 'month' | 'quarter' | 'year'
  startDate?: string
  endDate?: string
  start_date?: string  // For EmployeeDashboard compatibility
  end_date?: string    // For EmployeeDashboard compatibility
  month?: number // 1-12
  year?: number
  
  // Business filters
  bankNbfc?: string
  bank_name?: string  // For EmployeeDashboard compatibility
  nbfc_name?: string  // For EmployeeDashboard compatibility
  location?: 'Maharashtra' | 'Goa'
  productType?: string
  product_type?: string  // For EmployeeDashboard compatibility
  
  // Status filters
  caseStatus?: 'Positive' | 'Negative' | 'Profile Decline' | 'Pending'
  case_status?: string  // For EmployeeDashboard compatibility
  isRepeatCase?: boolean
  isOutOfTat?: boolean
  
  // Personnel filters
  fieldVerifier?: string
  backOfficeExecutive?: string
  
  // General filters
  search?: string
  isCompleted?: boolean
  isVerified?: boolean
  employee?: string
  formSchema?: string
  
  // EmployeeDashboard specific filters
  employee_name?: string
  case_type?: string
  status?: string
}

// Analytics and Statistics
export interface FormSchemaStatistics {
  total_schemas: number
  active_schemas: number
  total_entries: number
  completed_entries: number
  verified_entries: number
  average_completion_time: number
  recent_schemas: FormSchema[]
}

export interface FormEntryStatistics {
  total_entries: number
  completed_entries: number
  verified_entries: number
  pending_entries: number
  out_of_tat_entries: number
  repeat_cases: number
  average_completion_time: number
  entries_by_status: Record<string, number>
  entries_by_location: Record<string, number>
  entries_by_product: Record<string, number>
}

// API Response Types
export interface LoginResponse {
  user: User
  access: string
  refresh: string
}

export interface ApiResponse<T> {
  data: T
  message?: string
  status: 'success' | 'error'
}

export interface PaginatedResponse<T> {
  count: number
  next?: string
  previous?: string
  results: T[]
}

// File Attachment Types
export interface FileAttachment {
  id: string
  form_entry: string
  file: string
  original_filename: string
  file_type: string
  file_size: number
  description?: string
  is_verified: boolean
  verification_notes?: string
  uploaded_by: User
  uploaded_at: string
  verified_by?: User
  verified_at?: string
}

// Form Field File Types
export interface FormFieldFile {
  id: string
  form_entry: string
  field_name: string
  file: string
  original_filename: string
  file_type: string
  file_size: number
  description?: string
  is_verified: boolean
  verification_notes?: string
  uploaded_by: User
  uploaded_at: string
  verified_by?: User
  verified_at?: string
}

// Export Types
export interface ExportOptions {
  format: 'excel' | 'pdf' | 'csv'
  filters?: FormEntryFilters
  includeFields?: string[]
  excludeFields?: string[]
}

// Dashboard Types
export interface DashboardStats {
  totalSubmissions: number
  submissionsToday: number
  pendingVerifications: number
  completedVerifications: number
  outOfTatCases: number
  repeatCases: number
  averageTat: number
  recentActivity: FormEntry[]
}

// Organization Statistics Types
export interface OrganizationStatistics {
  total_organizations: number
  active_organizations: number
  business_type_breakdown: Array<{
    business_type: string
    count: number
  }>
  recent_organizations: Organization[]
}

// Constants
export const SUPPORTED_STATES = ['Maharashtra', 'Goa'] as const
export const SUPPORTED_PRODUCT_TYPES = ['Auto Loan', 'Home Loan', 'Personal Loan', 'Business Loan', 'Education Loan'] as const
export const CASE_STATUS_CHOICES = ['Positive', 'Negative', 'Profile Decline', 'Pending'] as const
export const MAX_FORM_FIELDS = 120
