import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useLanguageStore } from '@/store/languageStore'
import { t } from '@/lib/i18n'

export function LandingPage() {
  const navigate = useNavigate()
  const { language, isRTL } = useLanguageStore()

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="text-center py-12 sm:py-16">
        <div className="mb-6">
          <span className="inline-block bg-tfa-navy/10 text-tfa-navy text-sm font-semibold px-4 py-1.5 rounded">
            {isRTL ? 'تحديث الاستراتيجية 2025' : 'Strategy Refresh 2025'}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-tfa-gray-800 mb-4 leading-tight">
          {t('landing.title', language)}
        </h1>
        <p className="text-lg text-tfa-gray-600 font-medium mb-3">
          {t('landing.subtitle', language)}
        </p>
        <p className="text-tfa-gray-500 max-w-xl mx-auto leading-relaxed mb-10">
          {t('landing.description', language)}
        </p>

        <Button size="lg" onClick={() => navigate('/verify')}>
          {t('landing.cta', language)}
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
