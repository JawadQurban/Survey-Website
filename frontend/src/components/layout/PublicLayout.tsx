import { Outlet } from 'react-router-dom'
import { useLanguageStore } from '@/store/languageStore'
import { t } from '@/lib/i18n'

export function PublicLayout() {
  const { language, setLanguage, isRTL } = useLanguageStore()

  return (
    <div className={`min-h-screen bg-tfa-gray-50 font-${isRTL ? 'arabic' : 'sans'}`}>
      <header className="bg-tfa-navy text-white border-b border-white/10">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="The Financial Academy" className="h-7 w-auto brightness-0 invert" />
            <span className="text-sm text-white/80 hidden sm:block">
              {isRTL ? 'الأكاديمية المالية' : 'The Financial Academy'}
            </span>
          </div>
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="text-sm text-white/70 hover:text-white transition-colors px-3 py-1 rounded border border-white/20 hover:border-white/40"
          >
            {t('landing.language', language)}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-tfa-gray-200 mt-auto">
        <div className="mx-auto max-w-5xl px-4 py-5 text-center">
          <p className="text-xs text-tfa-gray-400">
            {isRTL
              ? '© 2025 الأكاديمية المالية. جميع الحقوق محفوظة.'
              : '© 2025 The Financial Academy. All rights reserved.'}
          </p>
        </div>
      </footer>
    </div>
  )
}
