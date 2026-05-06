import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { useLanguageStore } from '@/store/languageStore'
import { publicApi } from '@/lib/api'
import type { SurveyOverview, LandingInfoCard } from '@/types/survey'

const DEFAULT_INFO_CARDS: LandingInfoCard[] = [
  {
    icon:     '5-10',
    label_en: 'minutes approx.',
    label_ar: 'دقائق تقريباً',
    desc_en:  'Survey completion time',
    desc_ar:  'وقت إتمام الاستطلاع',
  },
  {
    icon:     '3',
    label_en: 'roles',
    label_ar: 'أدوار',
    desc_en:  'CEO, CHRO, L&D Leader',
    desc_ar:  'الرئيس التنفيذي، مدير الموارد البشرية، قائد التعلم',
  },
  {
    icon:     '100%',
    label_en: 'confidential',
    label_ar: 'سري',
    desc_en:  'Your data is protected and aggregated',
    desc_ar:  'بياناتك محمية ومجمّعة',
  },
]

export function SurveyLandingPage() {
  const { surveySlug } = useParams<{ surveySlug: string }>()
  const navigate = useNavigate()
  const { language, isRTL } = useLanguageStore()

  const { data: overviewData, isLoading, isError } = useQuery({
    queryKey: ['survey-landing', surveySlug, language],
    queryFn: () => publicApi.getSurveyOverview(surveySlug!, language),
    enabled: !!surveySlug,
  })

  const overview = overviewData?.data as SurveyOverview | undefined
  const landing  = overview?.landing_config

  const subtitle    = isRTL ? (landing?.hero_subtitle_ar ?? '') : (landing?.hero_subtitle_en ?? '')
  const ctaText     = isRTL ? (landing?.cta_text_ar || 'ابدأ الاستطلاع') : (landing?.cta_text_en || 'Begin Survey')
  const showCards   = landing?.show_info_cards !== false
  const infoCards   = landing?.info_cards?.length ? landing.info_cards : DEFAULT_INFO_CARDS

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tfa-navy" />
      </div>
    )
  }

  if (isError || !overview) {
    return (
      <div className="text-center py-24 text-tfa-gray-400">
        {isRTL ? 'الاستطلاع غير موجود.' : 'Survey not found.'}
      </div>
    )
  }

  return (
    <div className="animate-fade-in" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <div className="text-center py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-tfa-gray-800 mb-4 leading-tight">
          {overview.title}
        </h1>

        {subtitle && (
          <p className="text-lg text-tfa-gray-500 mb-4">{subtitle}</p>
        )}

        {overview.description ? (
          <p className="text-tfa-gray-600 max-w-2xl mx-auto leading-relaxed mb-4">
            {overview.description}
          </p>
        ) : null}

        <Button
          size="lg"
          onClick={() => navigate(`/survey/${surveySlug}/start`)}
          className="mt-4"
        >
          {ctaText}
        </Button>
      </div>

      {/* Info cards */}
      {showCards && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          {infoCards.map((card, i) => (
            <div key={i} className="bg-white border border-tfa-gray-200 rounded p-5 text-center shadow-card">
              <div className="text-3xl font-bold text-tfa-gray-800 mb-1">{card.icon}</div>
              <div className="text-sm font-semibold text-tfa-gray-700">
                {isRTL ? card.label_ar : card.label_en}
              </div>
              <div className="text-xs text-tfa-gray-400 mt-1">
                {isRTL ? card.desc_ar : card.desc_en}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
