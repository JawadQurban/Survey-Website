export type Language = 'en' | 'ar'

export type RespondentRole = 'ceo' | 'chro' | 'ld'

export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'open_text'
  | 'textarea'
  | 'number'
  | 'rating'
  | 'matrix'

export interface Translation {
  id: number
  language_code: string
}

export interface SurveyTranslation extends Translation {
  title: string
  description: string | null
  instructions: string | null
  thank_you_message: string | null
}

export interface SectionTranslation extends Translation {
  title: string
  description: string | null
}

export interface QuestionTranslation extends Translation {
  text: string
  helper_text: string | null
}

export interface OptionTranslation extends Translation {
  text: string
}

export interface VisibilityRule {
  id: number
  role: RespondentRole
}

export interface QuestionOption {
  id: number
  question_id: number
  option_key: string
  display_order: number
  is_active: boolean
  translations: OptionTranslation[]
}

export interface Question {
  id: number
  section_id: number
  question_key: string
  question_type: QuestionType
  display_order: number
  is_required: boolean
  is_active: boolean
  has_open_text_option: boolean
  open_text_label_en: string | null
  open_text_label_ar: string | null
  module: string | null
  translations: QuestionTranslation[]
  options: QuestionOption[]
  visibility_rules: VisibilityRule[]
}

export interface SurveySection {
  id: number
  survey_id: number
  section_key: string
  display_order: number
  is_active: boolean
  translations: SectionTranslation[]
  questions: Question[]
}

export interface Survey {
  id: number
  slug: string
  is_active: boolean
  is_fs_only: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
  translations: SurveyTranslation[]
  sections: SurveySection[]
}

export interface SurveyOverview {
  survey_id: number
  slug: string
  title: string
  description: string | null
  instructions: string | null
}

export interface AnswerInput {
  question_id: number
  selected_option_keys?: string[]
  open_text_value?: string
  numeric_value?: number
}

export interface SubmissionOut {
  id: number
  organization_id: number
  survey_id: number
  respondent_role: string
  respondent_email: string
  language_used: string
  status: 'draft' | 'submitted' | 'reopened'
  submitted_at: string | null
  created_at: string
  updated_at: string
  answers: AnswerOut[]
}

export interface AnswerOut {
  id: number
  question_id: number
  selected_option_keys: string[] | null
  open_text_value: string | null
  numeric_value: number | null
  updated_at: string
}

export interface SurveyListItem {
  id: number
  slug: string
  title: string
}

export interface SurveyBeginOut {
  survey_slug: string
  role: RespondentRole
  sector: string
}

export type Sector =
  | 'banks'
  | 'insurance'
  | 'capital_market'
  | 'fintech'
  | 'financing'
  | 'regulatory'
  | 'non_financial'
  | 'government'

export type OrgSize = 'lt_50' | '50_249' | '250_999' | '1000_4999' | 'gte_5000'
