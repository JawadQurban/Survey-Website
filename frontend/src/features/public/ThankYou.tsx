import { useSearchParams } from 'react-router-dom'
import { useLanguageStore } from '@/store/languageStore'
import { t } from '@/lib/i18n'
import { CheckCircle } from 'lucide-react'

export function ThankYou() {
  const [params] = useSearchParams()
  const ref = params.get('ref')
  const { language, isRTL } = useLanguageStore()

  return (
    <div className="max-w-md mx-auto text-center py-12 animate-fade-in">
      <div className="flex justify-center mb-6">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-green-600" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-tfa-gray-800 mb-3">
        {t('thankyou.title', language)}
      </h1>
      <p className="text-tfa-gray-500 leading-relaxed mb-6">
        {t('thankyou.description', language)}
      </p>

      {ref && (
        <div className="bg-tfa-gray-50 border border-tfa-gray-200 rounded-lg px-5 py-3 inline-block">
          <span className="text-xs text-tfa-gray-400 font-medium uppercase tracking-wide">
            {t('thankyou.ref', language)}:
          </span>
          <span className="ms-2 text-sm font-mono font-semibold text-tfa-gray-800">#{ref}</span>
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-tfa-gray-100">
        <img src="/logo.svg" alt="The Financial Academy" className="h-10 mx-auto opacity-40" />
        <p className="text-xs text-tfa-gray-400 mt-2">
          {isRTL ? 'الأكاديمية المالية' : 'The Financial Academy'}
        </p>
      </div>
    </div>
  )
}
