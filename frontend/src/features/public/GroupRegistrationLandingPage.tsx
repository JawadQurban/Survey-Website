import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useLanguageStore } from '@/store/languageStore'
import { t } from '@/lib/i18n'

export function GroupRegistrationLandingPage() {
  const navigate = useNavigate()
  const { language, isRTL } = useLanguageStore()

  return (
    <div className="animate-fade-in" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero */}
      <div className="text-center py-12 sm:py-16">
        <div className="inline-flex items-center gap-2 bg-tfa-navy/10 text-tfa-navy text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wide">
          {isRTL ? 'العروض التعليمية التقنية 2026 - 2027' : 'Technical Learning Offerings 2026 - 2027'}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-tfa-gray-800 mb-4 leading-tight">
          {t('gr.title', language)}
        </h1>
        <p className="text-tfa-gray-600 max-w-2xl mx-auto leading-relaxed mb-3 font-medium">
          {t('gr.subtitle', language)}
        </p>
        <p className="text-tfa-gray-500 max-w-2xl mx-auto leading-relaxed mb-10">
          {t('gr.description', language)}
        </p>
        <Button size="lg" onClick={() => navigate('form')}>
          {t('gr.cta', language)}
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        {[
          {
            icon: '4',
            label_en: 'Sectors',
            label_ar: 'قطاعات',
            desc_en: 'Business, Support, Operations, Control',
            desc_ar: 'الأعمال، الدعم، العمليات، الرقابة',
          },
          {
            icon: '60+',
            label_en: 'Courses',
            label_ar: 'دورة تدريبية',
            desc_en: 'Across 18 functional areas',
            desc_ar: 'عبر 18 مجالاً وظيفياً',
          },
          {
            icon: '25',
            label_en: 'Max per cohort',
            label_ar: 'الحد الأقصى لكل دفعة',
            desc_en: 'Participants per program delivery',
            desc_ar: 'مشارك لكل تنفيذ برنامج',
          },
        ].map((card) => (
          <div key={card.icon} className="bg-white border border-tfa-gray-200 rounded p-5 text-center shadow-card">
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
    </div>
  )
}
