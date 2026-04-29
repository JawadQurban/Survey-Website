import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { useLanguageStore } from '@/store/languageStore'
import { useSurveyStore } from '@/store/surveyStore'
import { publicApi } from '@/lib/api'
import { getTranslation, t } from '@/lib/i18n'
import type { Survey } from '@/types/survey'

export function SurveyReview() {
  const { surveySlug } = useParams<{ surveySlug: string }>()
  const navigate = useNavigate()
  const { language } = useLanguageStore()
  const { getAllAnswers, answers, clearSession, respondentRole } = useSurveyStore()
  const [submitError, setSubmitError] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['survey-questions', surveySlug, language],
    queryFn: () => publicApi.getSurveyQuestions(surveySlug!, language),
    enabled: !!surveySlug,
    retry: false,
  })

  useEffect(() => {
    if (isError && (error as AxiosError)?.response?.status === 401) {
      clearSession()
      navigate(`/survey/${surveySlug}/begin`, { replace: true })
    }
  }, [isError, error])

  const submitMutation = useMutation({
    mutationFn: () =>
      publicApi.submitSurvey({
        survey_slug: surveySlug!,
        language,
        answers: getAllAnswers(),
      }),
    onSuccess: (res) => {
      const subId = res.data.id
      clearSession()
      navigate(`/survey/${surveySlug}/thank-you?ref=${subId}`)
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setSubmitError(err.response?.data?.detail ?? t('error.generic', language))
    },
  })

  if (!respondentRole) {
    navigate(`/survey/${surveySlug}/begin`, { replace: true })
    return null
  }

  if (isLoading) return <PageSpinner />

  const survey = data?.data as Survey

  // Flatten all questions across all sections
  const allQuestions = (survey?.sections ?? []).flatMap((s) => s.questions)
  const answeredQuestions = allQuestions.filter((q) => answers[q.id])

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-tfa-gray-800">{t('review.title', language)}</h1>
        <p className="text-tfa-gray-500 text-sm mt-1">{t('review.description', language)}</p>
      </div>

      {submitError && <Alert variant="error">{submitError}</Alert>}

      <Alert variant="warning">{t('review.warning', language)}</Alert>

      {answeredQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-tfa-gray-800">
              {language === 'ar' ? 'الإجابات المدخلة' : 'Your Answers'}
            </h3>
          </CardHeader>
          <CardBody className="space-y-4">
            {answeredQuestions.map((q) => {
              const qTrans = getTranslation(q.translations, language)
              const ans = answers[q.id]
              let displayValue = ''

              if (ans?.open_text_value && !ans.selected_option_keys?.length) {
                displayValue = ans.open_text_value
              } else if (ans?.selected_option_keys?.length) {
                displayValue = ans.selected_option_keys
                  .map((key) => {
                    if (key === '__open_text__') return ans.open_text_value ?? '...'
                    const opt = q.options.find((o) => o.option_key === key)
                    return opt ? (getTranslation(opt.translations, language)?.text ?? key) : key
                  })
                  .join(', ')
              }

              return (
                <div key={q.id} className="border-b border-tfa-gray-100 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm text-tfa-gray-500">{qTrans?.text}</p>
                  <p className="text-sm font-medium text-tfa-gray-900 mt-1">
                    {displayValue || <span className="italic text-tfa-gray-400">—</span>}
                  </p>
                </div>
              )
            })}
          </CardBody>
        </Card>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          variant="secondary"
          onClick={() => navigate(`/survey/${surveySlug}/start`)}
          className="flex-1"
        >
          {t('review.back', language)}
        </Button>
        <Button
          onClick={() => submitMutation.mutate()}
          loading={submitMutation.isPending}
          className="flex-1"
        >
          {t('review.submit', language)}
        </Button>
      </div>
    </div>
  )
}
