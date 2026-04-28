import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { PageSpinner } from '@/components/ui/Spinner'
import { ProgressBar } from '@/components/survey/ProgressBar'
import { QuestionRenderer } from '@/components/survey/QuestionRenderer'
import { useLanguageStore } from '@/store/languageStore'
import { useSurveyStore } from '@/store/surveyStore'
import { publicApi } from '@/lib/api'
import { getTranslation, t } from '@/lib/i18n'
import type { Survey, SurveySection } from '@/types/survey'

const AUTOSAVE_INTERVAL_MS = 30_000

export function SurveyForm() {
  const { surveySlug } = useParams<{ surveySlug: string }>()
  const navigate = useNavigate()
  const { language } = useLanguageStore()
  const { answers, setAnswer, currentSectionIndex, setSection, markSaved, isDirty, getAllAnswers } = useSurveyStore()
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

  // Auto-save every 30 seconds if dirty
  useEffect(() => {
    autosaveTimer.current = setInterval(() => {
      if (isDirty) draftMutation.mutate()
    }, AUTOSAVE_INTERVAL_MS)
    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current)
    }
  }, [isDirty])

  if (isLoading) return <PageSpinner />
  if (isError) return <Alert variant="error">{t('error.generic', language)}</Alert>

  const survey = data?.data as Survey
  const sections = survey?.sections ?? []
  const currentSection: SurveySection | undefined = sections[currentSectionIndex]

  if (!currentSection) return <Alert variant="error">No sections found.</Alert>

  const sectionTrans = getTranslation(currentSection.translations, language)
  const sectionTitle = sectionTrans?.title ?? currentSection.section_key

  const isLastSection = currentSectionIndex === sections.length - 1

  const handleNext = () => {
    if (isDirty) draftMutation.mutate()
    if (isLastSection) {
      navigate(`/survey/${surveySlug}/review`)
    } else {
      setSection(currentSectionIndex + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <ProgressBar current={currentSectionIndex + 1} total={sections.length} />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold text-tfa-navy">{sectionTitle}</h2>
            <div className="text-xs text-tfa-gray-400 whitespace-nowrap pt-1">
              {isDirty
                ? t('survey.saving', language)
                : useSurveyStore.getState().lastSavedAt
                  ? t('survey.saved', language)
                  : null}
            </div>
          </div>
        </CardHeader>

        <CardBody>
          {currentSection.questions.map((question) => (
            <QuestionRenderer
              key={question.id}
              question={question}
              value={answers[question.id]}
              onChange={setAnswer}
              language={language}
            />
          ))}

          <div className="flex items-center justify-between pt-4 border-t border-tfa-gray-100">
            <Button
              variant="ghost"
              onClick={() => setSection(currentSectionIndex - 1)}
              disabled={currentSectionIndex === 0}
            >
              {t('survey.prev', language)}
            </Button>
            <Button onClick={handleNext}>
              {isLastSection
                ? (language === 'ar' ? 'مراجعة الإجابات' : 'Review Answers')
                : t('survey.next', language)}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
