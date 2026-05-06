import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { useLanguageStore } from '@/store/languageStore'
import { t } from '@/lib/i18n'
import { CheckCircle2 } from 'lucide-react'

export function GroupRegistrationThankYou() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const { language, isRTL } = useLanguageStore()
  const reference: string = state?.reference_number ?? ''

  return (
    <div className="animate-fade-in flex flex-col items-center justify-center text-center py-20" dir={isRTL ? 'rtl' : 'ltr'}>
      <CheckCircle2 className="h-16 w-16 text-green-500 mb-6" />

      <h1 className="text-2xl font-bold text-tfa-gray-800 mb-3">
        {t('gr.success_title', language)}
      </h1>

      <p className="text-tfa-gray-500 max-w-md leading-relaxed mb-8">
        {t('gr.success_desc', language)}
      </p>

      {reference && (
        <div className="bg-tfa-gray-50 border border-tfa-gray-200 rounded-lg px-8 py-5 mb-8">
          <p className="text-xs text-tfa-gray-400 uppercase tracking-wide mb-1">
            {t('gr.ref_label', language)}
          </p>
          <p className="text-2xl font-mono font-bold text-tfa-navy">{reference}</p>
          <p className="text-xs text-tfa-gray-400 mt-2">
            {isRTL
              ? 'احتفظ بهذا الرقم للرجوع إليه مستقبلاً.'
              : 'Keep this number for your records.'}
          </p>
        </div>
      )}

      <Button variant="ghost" onClick={() => navigate('/')}>
        {isRTL ? 'العودة إلى الرئيسية' : 'Return to Home'}
      </Button>
    </div>
  )
}
