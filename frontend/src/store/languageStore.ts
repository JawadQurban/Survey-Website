import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Language } from '@/types/survey'

interface LanguageState {
  language: Language
  setLanguage: (lang: Language) => void
  isRTL: boolean
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      isRTL: false,
      setLanguage: (lang) => {
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
        document.documentElement.lang = lang
        document.documentElement.classList.toggle('rtl', lang === 'ar')
        set({ language: lang, isRTL: lang === 'ar' })
      },
    }),
    { name: 'tfa-language' }
  )
)
