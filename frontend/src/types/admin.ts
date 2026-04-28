export interface AdminUser {
  id: number
  email: string
  full_name: string
  is_active: boolean
  is_superadmin: boolean
  last_login_at: string | null
  created_at: string
}

export interface Organization {
  id: number
  name_en: string
  name_ar: string | null
  slug: string
  sector: string | null
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: number
  organization_id: number
  email: string
  full_name: string | null
  role: 'ceo' | 'chro' | 'ld'
  survey_id: number | null
  is_active: boolean
  notes: string | null
  created_at: string
}

export interface DashboardData {
  total_organizations: number
  total_contacts: number
  active_surveys: number
  submissions: {
    submitted: number
    draft: number
    total: number
    completion_rate_pct: number
  }
  role_completion: {
    ceo: { completed: number; total: number }
    chro: { completed: number; total: number }
    ld: { completed: number; total: number }
  }
}

export interface SubmissionSummary {
  id: number
  organization_id: number
  organization_name: string
  survey_id: number
  respondent_role: string
  respondent_email: string
  status: string
  submitted_at: string | null
  created_at: string
}

export interface PaginatedResponse<T> {
  total: number
  items: T[]
}
