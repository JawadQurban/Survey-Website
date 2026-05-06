export interface AdminUser {
  id: number
  email: string
  full_name: string
  is_active: boolean
  is_superadmin: boolean
  last_login_at: string | null
  created_at: string
  permissions: string[]
}

export function hasPermission(user: AdminUser | null, permission: string): boolean {
  if (!user) return false
  if (user.is_superadmin || user.permissions.includes('*')) return true
  return user.permissions.includes(permission)
}

/** Standard survey access:
 *  - Superadmin always yes
 *  - Explicitly granted surveys.standard.manage → yes
 *  - Has ONLY group_registration permission → no (they should only see group reg)
 *  - No special permissions → yes (default admin access)
 */
export function canAccessStandardSurveys(user: AdminUser | null): boolean {
  if (!user) return false
  if (user.is_superadmin || user.permissions.includes('*')) return true
  if (hasPermission(user, 'surveys.standard.manage')) return true
  return !hasPermission(user, 'surveys.group_registration.manage')
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
  survey_slug: string | null
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
