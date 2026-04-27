import { useLanguageStore } from '@/store/languageStore'
import { t } from '@/lib/i18n'

interface ProgressBarProps {
  current: number
  total: number
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const { language } = useLanguageStore()
  const pct = Math.round((current / total) * 100)

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-tfa-gray-600">
          {t('survey.section', language, { current: String(current), total: String(total) })}
        </span>
        <span className="text-sm font-semibold text-tfa-navy">{pct}%</span>
      </div>
      <div className="h-2 bg-tfa-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-tfa-navy rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
