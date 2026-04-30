import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { useLanguageStore } from '@/store/languageStore'
import { publicApi } from '@/lib/api'
import type { SurveyListItem } from '@/types/survey'

export function LandingPage() {
  const navigate = useNavigate()
  const { language, isRTL } = useLanguageStore()

  const { data: surveysData } = useQuery({
    queryKey: ['active-surveys', language],
    queryFn: () => publicApi.listActiveSurveys(language),
    staleTime: 60_000,
  })

  const surveys = (surveysData?.data as SurveyListItem[]) ?? []
  const firstSurvey = surveys[0]

  const handleBegin = () => {
    if (firstSurvey) {
      navigate(`/survey/${firstSurvey.slug}/start`)
    }
  }

  return (
    <div className="animate-fade-in" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <div className="text-center py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-tfa-gray-800 mb-6 leading-tight">
          {isRTL ? 'دراسة مشهد التدريب' : 'Training Landscape Study'}
        </h1>
        <p className="text-tfa-gray-600 max-w-2xl mx-auto leading-relaxed mb-4">
          {isRTL
            ? 'في إطار مبادرة وطنية استراتيجية تركّز على قطاع الخدمات المالية في المملكة العربية السعودية، نجري استطلاعاً شاملاً لفهم الاحتياجات والأولويات الراهنة والمستقبلية في مجال التعلم والتطوير (L&D) عبر القطاع.'
            : 'As part of a strategic national initiative focused on the financial services sector in Saudi Arabia, we are conducting a comprehensive survey to better understand current and future learning and development (L&D) needs and priorities across the sector.'}
        </p>
        <p className="text-tfa-gray-500 max-w-xl mx-auto leading-relaxed mb-10">
          {isRTL
            ? 'ستُسهم رؤيتكم في تشكيل مستقبل تدريب الخدمات المالية في المملكة.'
            : 'Your insights will help shape the future of financial services training in the Kingdom.'}
        </p>

        <Button
          size="lg"
          onClick={handleBegin}
          disabled={!firstSurvey}
        >
          {isRTL ? 'ابدأ الاستطلاع' : 'Begin Survey'}
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        {[
          {
            icon: '15',
            label: isRTL ? 'دقيقة تقريباً' : 'minutes approx.',
            desc: isRTL ? 'وقت إتمام الاستطلاع' : 'Survey completion time',
          },
          {
            icon: '3',
            label: isRTL ? 'أدوار' : 'roles',
            desc: isRTL ? 'الرئيس التنفيذي، مدير الموارد البشرية، قائد التعلم' : 'CEO, CHRO, L&D Leader',
          },
          {
            icon: '100%',
            label: isRTL ? 'سري' : 'confidential',
            desc: isRTL ? 'بياناتك محمية ومجمّعة' : 'Your data is protected and aggregated',
          },
        ].map((item) => (
          <div
            key={item.icon}
            className="bg-white border border-tfa-gray-200 rounded p-5 text-center shadow-card"
          >
            <div className="text-3xl font-bold text-tfa-gray-800 mb-1">{item.icon}</div>
            <div className="text-sm font-semibold text-tfa-gray-700">{item.label}</div>
            <div className="text-xs text-tfa-gray-400 mt-1">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
