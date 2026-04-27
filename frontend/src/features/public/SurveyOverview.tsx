import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'
import { useLanguageStore } from '@/store/languageStore'
import { useSurveyStore } from '@/store/surveyStore'
import { publicApi } from '@/lib/api'
import { t } from '@/lib/i18n'
import type { SurveyOverview } from '@/types/survey'

const ROLE_KEY_MAP: Record<string, string> = { ceo: 'role.ceo', chro: 'role.chro', ld: 'role.ld' }

export function SurveyOverviewPage() {
  const { surveySlug } = useParams<{ surveySlug: string }>()
  const navigate = useNavigate()
  const { language } = useLanguageStore()
  const { respondentRole, organizationName } = useSurveyStore()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['survey-overview', surveySlug, language],
    queryFn: () => publicApi.getSurveyOverview(surveySlug!, language),
    enabled: !!surveySlug,
  })

  if (isLoading) return <PageSpinner />
  if (isError || !data) return <Alert variant="error">{t('error.generic', language)}</Alert>

  const overview = data.data as SurveyOverview

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold text-tfa-navy">{overview.title}</h1>
        </CardHeader>

        <CardBody className="space-y-5">
          {overview.description && (
            <p className="text-tfa-gray-600 leading-relaxed">{overview.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 py-4 border-y border-tfa-gray-100">
            <div>
              <p className="text-xs text-tfa-gray-400 font-medium uppercase tracking-wide mb-1">
                {t('survey.overview.role', language)}
              </p>
              <p className="text-sm font-semibold text-tfa-navy">
                {respondentRole ? t(ROLE_KEY_MAP[respondentRole] ?? 'role.ceo', language) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-tfa-gray-400 font-medium uppercase tracking-wide mb-1">
                {t('survey.overview.org', language)}
              </p>
              <p className="text-sm font-semibold text-tfa-navy">{organizationName ?? '—'}</p>
            </div>
          </div>

          {overview.instructions && (
            <div className="bg-tfa-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-tfa-gray-700 mb-2">
                {language === 'ar' ? 'تعليمات' : 'Instructions'}
              </h3>
              <p className="text-sm text-tfa-gray-600 leading-relaxed whitespace-pre-line">
                {overview.instructions}
              </p>
            </div>
          )}

          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate(`/survey/${surveySlug}/start`)}
          >
            {t('survey.overview.start', language)}
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
