import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { useLanguageStore } from '@/store/languageStore'
import { useSurveyStore } from '@/store/surveyStore'
import { publicApi } from '@/lib/api'
import { t } from '@/lib/i18n'
import type { VerificationConfirmOut } from '@/types/survey'

export function VerifyEmail() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { language } = useLanguageStore()
  const { setSession } = useSurveyStore()

  const mutation = useMutation({
    mutationFn: () => publicApi.verifyEmail(email, language),
    onSuccess: (res) => {
      const data = res.data as VerificationConfirmOut
      setSession({
        organizationId: data.organization_id,
        organizationName: data.organization_name,
        respondentRole: data.respondent_role,
        surveySlug: data.survey_slug,
      })
      navigate(`/survey/${data.survey_slug}/overview`)
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setError(err.response?.data?.detail ?? t('error.generic', language))
    },
  })

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-tfa-gray-800">
            {t('verify.title', language)}
          </h2>
          <p className="text-sm text-tfa-gray-500 mt-1">
            {t('verify.subtitle', language)}
          </p>
        </CardHeader>

        <CardBody>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              mutation.mutate()
            }}
            className="space-y-4"
          >
            <Input
              label={t('verify.email.label', language)}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('verify.email.placeholder', language)}
              required
              autoFocus
            />
            <Button
              type="submit"
              className="w-full"
              loading={mutation.isPending}
            >
              {t('verify.submit', language)}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  )
}
