import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AnswerInput, RespondentRole } from '@/types/survey'

interface SurveySession {
  surveySlug: string | null
  respondentRole: RespondentRole | null
  // Org info from onboarding
  organizationName: string | null
  sector: string | null
  regulator: string | null
  orgSize: string | null
  // Respondent identity from onboarding
  respondentName: string | null
  respondentEmail: string | null
  // Answer tracking
  answers: Record<number, AnswerInput>
  isDirty: boolean
  lastSavedAt: string | null
}

interface SurveyActions {
  setSession: (data: {
    surveySlug: string
    respondentRole: RespondentRole
    organizationName?: string | null
    sector?: string | null
    regulator?: string | null
    orgSize?: string | null
    respondentName?: string | null
    respondentEmail?: string | null
  }) => void
  setAnswer: (answer: AnswerInput) => void
  markSaved: () => void
  clearSession: () => void
  getAllAnswers: () => AnswerInput[]
}

const initialState: SurveySession = {
  surveySlug: null,
  respondentRole: null,
  organizationName: null,
  sector: null,
  regulator: null,
  orgSize: null,
  respondentName: null,
  respondentEmail: null,
  answers: {},
  isDirty: false,
  lastSavedAt: null,
}

export const useSurveyStore = create<SurveySession & SurveyActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSession: (data) =>
        set({
          surveySlug: data.surveySlug,
          respondentRole: data.respondentRole,
          organizationName: data.organizationName ?? null,
          sector: data.sector ?? null,
          regulator: data.regulator ?? null,
          orgSize: data.orgSize ?? null,
          respondentName: data.respondentName ?? null,
          respondentEmail: data.respondentEmail ?? null,
          answers: {},
          isDirty: false,
        }),

      setAnswer: (answer) =>
        set((state) => ({
          answers: { ...state.answers, [answer.question_id]: answer },
          isDirty: true,
        })),

      markSaved: () => set({ isDirty: false, lastSavedAt: new Date().toISOString() }),

      clearSession: () => set(initialState),

      getAllAnswers: () => Object.values(get().answers),
    }),
    { name: 'tfa-survey-session' }
  )
)
