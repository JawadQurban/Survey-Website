import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AnswerInput, RespondentRole } from '@/types/survey'

interface SurveySession {
  organizationId: number | null
  organizationName: string | null
  respondentRole: RespondentRole | null
  surveySlug: string | null
  currentSectionIndex: number
  answers: Record<number, AnswerInput>
  isDirty: boolean
  lastSavedAt: string | null
}

interface SurveyActions {
  setSession: (data: {
    organizationId: number
    organizationName: string
    respondentRole: RespondentRole
    surveySlug: string
  }) => void
  setAnswer: (answer: AnswerInput) => void
  setSection: (index: number) => void
  markSaved: () => void
  clearSession: () => void
  getAllAnswers: () => AnswerInput[]
}

const initialState: SurveySession = {
  organizationId: null,
  organizationName: null,
  respondentRole: null,
  surveySlug: null,
  currentSectionIndex: 0,
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
          organizationId: data.organizationId,
          organizationName: data.organizationName,
          respondentRole: data.respondentRole,
          surveySlug: data.surveySlug,
          currentSectionIndex: 0,
          answers: {},
          isDirty: false,
        }),

      setAnswer: (answer) =>
        set((state) => ({
          answers: { ...state.answers, [answer.question_id]: answer },
          isDirty: true,
        })),

      setSection: (index) => set({ currentSectionIndex: index }),

      markSaved: () => set({ isDirty: false, lastSavedAt: new Date().toISOString() }),

      clearSession: () => set(initialState),

      getAllAnswers: () => Object.values(get().answers),
    }),
    { name: 'tfa-survey-session' }
  )
)
