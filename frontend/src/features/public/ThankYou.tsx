import { useSearchParams } from 'react-router-dom'
import { useLanguageStore } from '@/store/languageStore'
import { CheckCircle2 } from 'lucide-react'

export function ThankYou() {
  const [params] = useSearchParams()
  const ref = params.get('ref')
  const { isRTL } = useLanguageStore()

  return (
    <div
      className="max-w-xl mx-auto animate-fade-in py-10"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Card */}
      <div className="bg-white border border-tfa-gray-200 rounded-lg shadow-card overflow-hidden">

        {/* Top accent bar */}
        <div className="h-1.5 bg-tfa-navy w-full" />

        <div className="px-8 py-10 text-center">

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-green-50 border-4 border-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-2xl font-bold text-tfa-gray-900 mb-2">
            {isRTL ? 'تم استلام إجاباتك' : 'Submission Received'}
          </h1>

          {/* Sub-headline */}
          <p className="text-tfa-navy font-semibold text-sm mb-5">
            {isRTL
              ? 'شكراً لمشاركتكم في دراسة مشهد التدريب'
              : 'Thank you for participating in the Training Landscape Study'}
          </p>

          {/* Divider */}
          <div className="border-t border-tfa-gray-100 my-5" />

          {/* Body message */}
          <p className="text-tfa-gray-600 leading-relaxed text-sm mb-4">
            {isRTL
              ? 'لقد تلقينا إجاباتك بنجاح. ستُسهم مشاركتك في تشكيل مستقبل التدريب والتطوير في قطاع الخدمات المالية بالمملكة العربية السعودية.'
              : 'We have successfully received your responses. Your participation will help shape the future of learning and development across the financial services sector in Saudi Arabia.'}
          </p>
          <p className="text-tfa-gray-500 text-sm">
            {isRTL
              ? 'ستُستخدم بياناتك بشكل مجمّع وسرّي تماماً لدعم مبادرة تحديث استراتيجية الأكاديمية المالية.'
              : 'Your data will be used in aggregate and kept strictly confidential to support The Financial Academy\'s Strategy Refresh initiative.'}
          </p>

          {/* Reference number */}
          {ref && (
            <div className="mt-6 bg-tfa-gray-50 border border-tfa-gray-200 rounded-lg px-5 py-3 inline-block">
              <p className="text-xs text-tfa-gray-400 font-medium uppercase tracking-wide mb-1">
                {isRTL ? 'رقم المرجع' : 'Reference Number'}
              </p>
              <p className="text-sm font-mono font-bold text-tfa-navy">#{ref}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-tfa-gray-50 border-t border-tfa-gray-100 px-8 py-5 flex flex-col items-center gap-2">
          <img
            src="/logo.png"
            alt="The Financial Academy"
            className="h-8 w-auto opacity-60"
          />
          <p className="text-xs text-tfa-gray-400">
            {isRTL ? 'الأكاديمية المالية' : 'The Financial Academy'}
          </p>
          <p className="text-xs text-tfa-gray-300">
            {isRTL ? '#معاً_نصنع_الأثر' : '#Together_we_make_impact'}
          </p>
        </div>
      </div>
    </div>
  )
}
