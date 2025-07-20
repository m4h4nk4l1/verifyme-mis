export interface User {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE'
  organization: string
  organization_name: string
  employee_data?: Record<string, unknown>
  phone?: string
  is_active: boolean
  is_email_verified: boolean
  date_joined: string
  last_login?: string
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  display_name: string
  email: string
  business_type: 'bank' | 'nbfc' | 'financial_services' | 'other'
  max_employees: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  access: string
  refresh: string
  user: User
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  detail?: string
  code?: string
}

// Business Logic Constants from Backend
export const MAX_FORM_FIELDS = 120
export const TAT_HOURS_LIMIT = 24
export const SUPPORTED_STATES = ['Maharashtra', 'Goa'] as const
export const SUPPORTED_PRODUCT_TYPES = [
  'Auto Loan',
  'Home Loan',
  'Personal Loan',
  'Business Loan',
  'Credit Card',
] as const
export const CASE_STATUS_CHOICES = [
  'Positive',
  'Negative',
  'Profile Decline',
  'Pending',
  'In Progress',
  'Approved',
  'Rejected'
] as const

export type SupportedState = typeof SUPPORTED_STATES[number]
export type ProductType = typeof SUPPORTED_PRODUCT_TYPES[number]
export type CaseStatus = typeof CASE_STATUS_CHOICES[number]

export interface FormSchema {
  id: string
  name: string
  description: string
  fields: FormField[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FormField {
  id: string
  name: string
  display_name: string
  field_type: 'numeric' | 'string' | 'alphanumeric' | 'symbols_alphanumeric' | 'boolean' | 'date' | 'datetime' | 'file'
  validation_rules?: Record<string, unknown>
  is_required: boolean
  is_unique: boolean
  default_value?: unknown
  help_text?: string
  order: number
  is_active: boolean
  is_duplicate_check?: boolean
}

export interface FormEntry {
  id: string
  form_schema: string
  form_data: Record<string, unknown>
  is_completed: boolean
  is_verified: boolean
  verification_notes?: string
  tat_start_time: string
  tat_completion_time?: string
  created_at: string
  updated_at: string
  submitted_by: User
  verified_by?: User
  case_status: CaseStatus
  product_type?: ProductType
  location?: SupportedState
  bank_nbfc_name?: string
  field_verifier_name?: string
  back_office_executive_name?: string
  is_repeat_case: boolean
  is_out_of_tat: boolean
}

export interface FileAttachment {
  id: string
  form_entry: string
  file: string
  file_url?: string
  original_filename: string
  file_type: string
  file_size: number
  file_size_mb: number
  description?: string
  is_verified: boolean
  verification_notes?: string
  uploaded_by: User
  uploaded_at: string
  verified_by?: User
  verified_at?: string
}

export interface AuditLog {
  id: string
  user: User
  action: string
  details: string
  ip_address: string
  user_agent: string
  timestamp: string
  related_object_type?: string
  related_object_id?: string
}

export interface AnalyticsData {
  total_submissions: number
  submissions_today: number
  submissions_this_month: number
  pending_verifications: number
  out_of_tat_count: number
  repeat_cases_count: number
  by_status: Record<CaseStatus, number>
  by_product_type: Record<ProductType, number>
  by_location: Record<SupportedState, number>
  by_bank_nbfc: Record<string, number>
}

export interface ExportOptions {
  format: 'excel' | 'pdf'
  date_range?: {
    start_date: string
    end_date: string
  }
  filters?: {
    case_status?: CaseStatus[]
    product_type?: ProductType[]
    location?: SupportedState[]
    bank_nbfc_name?: string[]
    field_verifier_name?: string[]
    back_office_executive_name?: string[]
    is_repeat_case?: boolean
    is_out_of_tat?: boolean
  }
  include_attachments?: boolean
} 