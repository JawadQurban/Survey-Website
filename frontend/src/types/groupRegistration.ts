export interface CourseEntry {
  code:          string
  title:         string
  duration_days: number | null
  capacity:      number
}

// Nested catalog: { sector: { functional_area: CourseEntry[] } }
export type CourseCatalog = Record<string, Record<string, CourseEntry[]>>

export interface NominationRow {
  id:                 string   // local UUID for React key
  sector:             string
  functional_area:    string
  course_code:        string
  course_title:       string
  delivery_mode:      string
  preferred_quarters: number[]
  num_nominations:    number | ''
}

export interface GroupRegistrationFormData {
  // Section 1
  organization_name:    string
  department:           string
  focal_point_name:     string
  focal_point_position: string
  email:                string
  mobile:               string
  // Section 2
  selected_sectors:          string[]
  selected_functional_areas: string[]
  // Section 3
  nominations: NominationRow[]
  // Section 4
  special_requests: string
  // Section 5
  submitted_by:    string
  pdpl_authorized: boolean
}

export interface GroupRegistrationOut {
  id:                        number
  reference_number:          string
  organization_name:         string
  department:                string | null
  focal_point_name:          string
  focal_point_position:      string | null
  email:                     string
  mobile:                    string | null
  selected_sectors:          string[] | null
  selected_functional_areas: string[] | null
  nominations:               NominationRow[] | null
  special_requests:          string | null
  submitted_by:              string | null
  pdpl_authorized:           boolean
  language_used:             string
  status:                    string
  submitted_at:              string | null
  created_at:                string
  updated_at:                string
}

export interface GroupRegistrationSummary {
  id:               number
  reference_number: string
  organization_name: string
  focal_point_name:  string
  email:             string
  nomination_count:  number
  status:            string
  submitted_at:      string | null
  created_at:        string
}

export interface FormConfig {
  id:             number
  slug:           string
  title_en:       string
  title_ar:       string | null
  description_en: string | null
  description_ar: string | null
  is_active:      boolean
  settings:       FormSettings | null
  created_at:     string
  updated_at:     string
}

export interface TrainingCourse {
  id:             number
  sector:         string
  functional_area: string
  course_code:    string
  course_title:   string
  duration_days:  number | null
  capacity:       number
  is_active:      boolean
}

export const SECTORS = [
  'BUSINESS',
  'SUPPORT',
  'OPERATIONS',
  'CONTROL',
] as const

export const DEFAULT_DELIVERY_MODES = ['Blended', 'In-Person', 'Virtual']

export const DELIVERY_MODES = ['Blended', 'In-Person', 'Virtual'] as const

export interface FormSettings {
  // Landing page
  cta_text_en?:      string
  cta_text_ar?:      string
  show_info_cards?:  boolean
  info_cards?: Array<{
    icon:     string
    label_en: string
    label_ar: string
    desc_en:  string
    desc_ar:  string
  }>
  // Form content
  pdpl_text_en?:     string
  pdpl_text_ar?:     string
  delivery_modes?:   string[]
  // Submit button
  submit_text_en?:   string
  submit_text_ar?:   string
}

export const SECTOR_LABELS: Record<string, { en: string; ar: string }> = {
  BUSINESS:   { en: 'Business Sector',    ar: 'قطاع الأعمال' },
  SUPPORT:    { en: 'Support Sector',     ar: 'القطاع الداعم' },
  OPERATIONS: { en: 'Operations Sector',  ar: 'قطاع العمليات' },
  CONTROL:    { en: 'Control Sector',     ar: 'قطاع الرقابة' },
}
