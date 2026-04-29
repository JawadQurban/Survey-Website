import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { PageSpinner } from '@/components/ui/Spinner'
import { QuestionRenderer } from '@/components/survey/QuestionRenderer'
import { useLanguageStore } from '@/store/languageStore'
import { useSurveyStore } from '@/store/surveyStore'
import { publicApi } from '@/lib/api'
import { t } from '@/lib/i18n'
import type { Survey } from '@/types/survey'

const AUTOSAVE_INTERVAL_MS = 30_000

export function SurveyForm() {
  const { surveySlug } = useParams<{ surveySlug: string }>()
  const navigate = useNavigate()
  const { language } = useLanguageStore()
  const { answers, setAnswer, markSaved, isDirty, getAllAnswers, respondentRole } = useSurveyStore()
  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['survey-questions', surveySlug, language],
    queryFn: () => publicApi.getSurveyQuestions(surveySlug!, language),
    enabled: !!surveySlug,
  })

  const draftMutation = useMutation({
    mutationFn: () =>
      publicApi.saveDraft({
        survey_slug: surveySlug!,
        language,
        answers: getAllAnswers(),
      }),
    onSuccess: () => markSaved(),
  })

  useEffect(() => {
    autosaveTimer.current = setInterval(() => {
      if (isDirty) draftMutation.mutate()
    }, AUTOSAVE_INTERVAL_MS)
    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current)
    }
  }, [isDirty])

  // No session — redirect to onboarding
  if (!respondentRole) {
    navigate(`/survey/${surveySlug}/begin`, { replace: true })
    return null
  }

  if (isLoading) return <PageSpinner />
  if (isError) return <Alert variant="error">{t('error.generic', language)}</Alert>

  const survey = data?.data as Survey

  // Flatten: collect all questions from all sections into a single list
  const allQuestions = (survey?.sections ?? []).flatMap((s) => s.questions)

  if (!allQuestions.length) return <Alert variant="error">{language === 'ar' ? 'لا توجد أسئلة.' : 'No questions found.'}</Alert>

  const handleReview = () => {
    if (isDirty) draftMutation.mutate()
    navigate(`/survey/${surveySlug}/review`)
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-4">
      {/* Save status */}
      <div className="flex justify-end h-5">
        <span className="text-xs text-tfa-gray-400">
          {isDirty
            ? t('survey.saving', language)
            : useSurveyStore.getState().lastSavedAt
              ? t('survey.saved', language)
              : null}
        </span>
      </div>

      {/* All questions in one scrollable flow — no section grouping */}
      <div className="bg-white border border-tfa-gray-200 rounded shadow-card divide-y divide-tfa-gray-100">
        {allQuestions.map((question) => (
          <div key={question.id} className="px-6 py-5">
            <QuestionRenderer
              question={question}
              value={answers[question.id]}
              onChange={setAnswer}
              language={language}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleReview} size="lg">
          {language === 'ar' ? 'مراجعة الإجابات' : 'Review Answers'}
        </Button>
      </div>
    </div>
  )
}
