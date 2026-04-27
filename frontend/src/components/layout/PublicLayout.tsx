import { Outlet } from 'react-router-dom'
import { useLanguageStore } from '@/store/languageStore'
import { t } from '@/lib/i18n'

export function PublicLayout() {
  const { language, setLanguage, isRTL } = useLanguageStore()

  return (
    <div className={`min-h-screen bg-tfa-gray-50 font-${isRTL ? 'arabic' : 'sans'}`}>
      {/* Top bar */}
      <header className="bg-tfa-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="The Financial Academy" className="h-8 w-auto" />
            <span className="text-sm font-medium opacity-90 hidden sm:block">
              {isRTL ? 'الأكاديمية المالية' : 'The Financial Academy'}
            </span>
          </div>
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="text-sm font-medium text-white/80 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
          >
            {t('landing.language', language)}
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-tfa-gray-200 mt-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center">
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
