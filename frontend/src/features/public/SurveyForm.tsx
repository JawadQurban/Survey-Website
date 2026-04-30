import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { PageSpinner } from '@/components/ui/Spinner'
import { QuestionRenderer } from '@/components/survey/QuestionRenderer'
import { useLanguageStore } from '@/store/languageStore'
import { useSurveyStore } from '@/store/surveyStore'
import { publicApi } from '@/lib/api'
import { t } from '@/lib/i18n'
import type { Survey, RespondentRole } from '@/types/survey'
import type { AxiosError } from 'axios'

const AUTOSAVE_INTERVAL_MS = 30_000

// Default regulator per sector — sent to keep older backend versions happy.
// The backend no longer validates this field; it is silently ignored once deployed.
const SECTOR_REGULATOR: Record<string, string> = {
  banks:          'sama',
  insurance:      'ia',
  capital_market: 'cma',
  fintech:        'sama',
  financing:      'sama',
  regulatory:     'other',
}

// ─── Intro question data ──────────────────────────────────────────────────────

const SECTORS = [
  { key: 'banks',          badge: 'B', en: 'Banks',                       ar: 'البنوك',                    subEn: 'Bank licensed by SAMA',                subAr: 'بنك مرخص من ساما' },
  { key: 'insurance',      badge: 'I', en: 'Insurance',                   ar: 'التأمين',                   subEn: 'Insurance / Reinsurance company',      subAr: 'شركة تأمين / إعادة تأمين' },
  { key: 'capital_market', badge: 'C', en: 'Capital Market / Investment', ar: 'السوق المالية / الاستثمار', subEn: 'CMA-licensed company',                 subAr: 'شركة مرخصة من هيئة السوق المالية' },
  { key: 'fintech',        badge: 'F', en: 'FinTech / Payments',          ar: 'الفنتك / المدفوعات',        subEn: 'Financial technology or payments co.', subAr: 'شركة تقنية مالية أو مدفوعات' },
  { key: 'financing',      badge: '$', en: 'Financing',                   ar: 'التمويل',                   subEn: 'Licensed financing company',           subAr: 'شركة تمويل مرخصة' },
  { key: 'regulatory',     badge: 'R', en: 'Regulatory Body',             ar: 'جهة تنظيمية',               subEn: 'SAMA / Capital Market / Insurance',    subAr: 'ساما / السوق المالية / التأمين' },
  { key: 'non_financial',  badge: 'N', en: 'Non-Financial Sector',        ar: 'قطاع غير مالي',             subEn: 'Non-financial sector company',         subAr: 'شركة من قطاع غير مالي' },
  { key: 'government',     badge: 'G', en: 'Government Body',             ar: 'جهة حكومية',                subEn: 'Ministry or government entity',        subAr: 'وزارة أو هيئة حكومية' },
]

const ORG_SIZES = [
  { key: 'lt_50',     en: 'Less than 50 employees',  ar: 'أقل من 50 موظفاً' },
  { key: '50_249',    en: '50 – 249 employees',       ar: '50 – 249 موظفاً' },
  { key: '250_999',   en: '250 – 999 employees',      ar: '250 – 999 موظفاً' },
  { key: '1000_4999', en: '1,000 – 4,999 employees', ar: '1,000 – 4,999 موظفاً' },
  { key: 'gte_5000',  en: '5,000 employees or more', ar: '5,000 موظف فأكثر' },
]

const ROLES = [
  { key: 'ceo',  badge: 'CEO',  en: 'CEO / Executive', ar: 'الرئيس التنفيذي / القيادة', descEn: 'C-suite executive or board level',  descAr: 'قيادة تنفيذية أو مجلس إدارة' },
  { key: 'chro', badge: 'CHRO', en: 'CHRO',            ar: 'مدير الموارد البشرية',       descEn: 'Head of Human Capital / HR',         descAr: 'رئيس الموارد البشرية / رأس المال البشري' },
  { key: 'ld',   badge: 'LD',   en: 'L&D Manager',     ar: 'مدير التعلم والتطوير',       descEn: 'Head of Learning & Development',     descAr: 'رئيس التعلم والتطوير' },
]

// ─── Intro form (sector / org size / role) ────────────────────────────────────

interface IntroFormProps {
  onBegin: (sector: string, orgSize: string, role: string) => void
  loading: boolean
  externalError: string
  isRTL: boolean
}

function IntroForm({ onBegin, loading, externalError, isRTL }: IntroFormProps) {
  const [sector,  setSector]  = useState('')
  const [orgSize, setOrgSize] = useState('')
  const [role,    setRole]    = useState('')
  const [error,   setError]   = useState('')

  const handleSubmit = () => {
    if (!sector)  return setError(isRTL ? 'يرجى اختيار القطاع'         : 'Please select your sector')
    if (!orgSize) return setError(isRTL ? 'يرجى اختيار حجم المنشأة'    : 'Please select your organization size')
    if (!role)    return setError(isRTL ? 'يرجى اختيار دورك'            : 'Please select your role')
    setError('')
    onBegin(sector, orgSize, role)
  }

  const displayError = error || externalError

  return (
    <div className="bg-white border border-tfa-gray-200 rounded shadow-card divide-y divide-tfa-gray-100">

      {/* Q1: Sector */}
      <div className="px-6 py-5">
        <p className="text-sm font-semibold text-tfa-gray-800 mb-1">
          {isRTL ? 'ما القطاع الذي تعمل فيه حالياً؟' : 'Which sector are you currently operating in?'}
          <span className="text-red-500 ml-1">*</span>
        </p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {SECTORS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => { setSector(s.key); setError('') }}
              className={`flex items-start gap-3 w-full border rounded p-3 transition-all ${
                isRTL ? 'flex-row-reverse text-right' : 'text-left'
              } ${
                sector === s.key
                  ? 'border-tfa-navy bg-tfa-navy/5 ring-1 ring-tfa-navy'
                  : 'border-tfa-gray-200 bg-white hover:border-tfa-gray-400'
              }`}
            >
              <span className={`shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                sector === s.key ? 'bg-tfa-navy text-white' : 'bg-tfa-gray-100 text-tfa-gray-600'
              }`}>{s.badge}</span>
              <div>
                <p className={`text-sm font-semibold ${sector === s.key ? 'text-tfa-navy' : 'text-tfa-gray-800'}`}>
                  {isRTL ? s.ar : s.en}
                </p>
                <p className="text-xs text-tfa-gray-500 mt-0.5">{isRTL ? s.subAr : s.subEn}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Q2: Org Size */}
      <div className="px-6 py-5">
        <p className="text-sm font-semibold text-tfa-gray-800 mb-1">
          {isRTL
            ? 'ما حجم منشأتك من حيث عدد الموظفين في المملكة العربية السعودية؟'
            : 'What is the size of your organization in terms of number of employees in KSA?'}
          <span className="text-red-500 ml-1">*</span>
        </p>
        <div className="space-y-2 mt-3">
          {ORG_SIZES.map((s) => (
            <label
              key={s.key}
              className={`flex items-center justify-between w-full border rounded p-3 cursor-pointer transition-all ${
                orgSize === s.key ? 'border-tfa-navy bg-tfa-navy/5' : 'border-tfa-gray-200 hover:border-tfa-gray-400'
              } ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <span className={`text-sm ${orgSize === s.key ? 'font-medium text-tfa-navy' : 'text-tfa-gray-700'}`}>
                {isRTL ? s.ar : s.en}
              </span>
              <input
                type="radio"
                name="orgSize"
                value={s.key}
                checked={orgSize === s.key}
                onChange={() => { setOrgSize(s.key); setError('') }}
                className="accent-tfa-navy"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Q3: Role */}
      <div className="px-6 py-5">
        <p className="text-sm font-semibold text-tfa-gray-800 mb-1">
          {isRTL
            ? 'ما الذي يصف دورك الحالي في المنظمة بشكل أفضل؟'
            : 'What best describes your current role within the organization?'}
          <span className="text-red-500 ml-1">*</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => { setRole(r.key); setError('') }}
              className={`flex items-start gap-3 w-full border rounded p-4 transition-all ${
                isRTL ? 'flex-row-reverse text-right' : 'text-left'
              } ${
                role === r.key
                  ? 'border-tfa-navy bg-tfa-navy/5 ring-1 ring-tfa-navy'
                  : 'border-tfa-gray-200 bg-white hover:border-tfa-gray-400'
              }`}
            >
              <span className={`shrink-0 w-9 h-9 rounded flex items-center justify-center text-xs font-bold ${
                role === r.key ? 'bg-tfa-navy text-white' : 'bg-tfa-gray-100 text-tfa-gray-600'
              }`}>{r.badge}</span>
              <div>
                <p className={`text-sm font-semibold ${role === r.key ? 'text-tfa-navy' : 'text-tfa-gray-800'}`}>
                  {isRTL ? r.ar : r.en}
                </p>
                <p className="text-xs text-tfa-gray-500 mt-0.5">{isRTL ? r.descAr : r.descEn}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Error + Submit */}
      <div className="px-6 py-5 space-y-4">
        {displayError && <Alert variant="error">{displayError}</Alert>}
        <Button className="w-full" size="lg" onClick={handleSubmit} loading={loading}>
          {isRTL ? 'ابدأ الاستطلاع' : 'Start Survey'}
        </Button>
      </div>
    </div>
  )
}

// ─── Main survey form ─────────────────────────────────────────────────────────

export function SurveyForm() {
  const { surveySlug } = useParams<{ surveySlug: string }>()
  const navigate       = useNavigate()
  const { language, isRTL } = useLanguageStore()
  const { answers, setAnswer, markSaved, isDirty, getAllAnswers, respondentRole, setSession, clearSession } = useSurveyStore()
  const autosaveTimer  = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['survey-questions', surveySlug, language],
    queryFn:  () => publicApi.getSurveyQuestions(surveySlug!, language),
    enabled:  !!respondentRole && !!surveySlug,
    retry:    false,
  })

  // Session cookie expired → clear local session so intro re-appears
  useEffect(() => {
    if (isError && (error as AxiosError)?.response?.status === 401) {
      clearSession()
    }
  }, [isError, error])

  const draftMutation = useMutation({
    mutationFn: () =>
      publicApi.saveDraft({
        survey_slug: surveySlug!,
        language,
        answers:     getAllAnswers(),
      }),
    onSuccess: () => markSaved(),
  })

  useEffect(() => {
    autosaveTimer.current = setInterval(() => {
      if (isDirty) draftMutation.mutate()
    }, AUTOSAVE_INTERVAL_MS)
    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current)
    }
  }, [isDirty])

  // Begin-survey mutation — called when the intro form is submitted
  const beginMutation = useMutation({
    mutationFn: (params: { sector: string; orgSize: string; role: string }) =>
      publicApi.beginSurvey(surveySlug!, {
        sector:    params.sector,
        org_size:  params.orgSize,
        role:      params.role,
        regulator: SECTOR_REGULATOR[params.sector] ?? null,
      }),
    onSuccess: (_data, variables) => {
      setSession({
        surveySlug:    surveySlug!,
        respondentRole: variables.role as RespondentRole,
        sector:        variables.sector,
        orgSize:       variables.orgSize,
      })
    },
  })

  // ── Intro phase (no session yet) ──────────────────────────────────────────
  if (!respondentRole) {
    const beginError =
      (beginMutation.error as { response?: { data?: { detail?: string } } } | null)
        ?.response?.data?.detail
      ?? (beginMutation.isError ? (isRTL ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.') : '')

    return (
      <div className="max-w-2xl mx-auto animate-fade-in" dir={isRTL ? 'rtl' : 'ltr'}>
        <IntroForm
          onBegin={(sector, orgSize, role) => beginMutation.mutate({ sector, orgSize, role })}
          loading={beginMutation.isPending}
          externalError={beginError}
          isRTL={isRTL}
        />
      </div>
    )
  }

  // ── Survey phase ──────────────────────────────────────────────────────────
  if (isLoading) return <PageSpinner />
  if (isError)   return <Alert variant="error">{t('error.generic', language)}</Alert>

  const survey       = data?.data as Survey
  const allQuestions = (survey?.sections ?? []).flatMap((s) => s.questions)

  if (!allQuestions.length)
    return <Alert variant="error">{language === 'ar' ? 'لا توجد أسئلة.' : 'No questions found.'}</Alert>

  const handleReview = () => {
    if (isDirty) draftMutation.mutate()
    navigate(`/survey/${surveySlug}/review`)
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Save status */}
      <div className="flex justify-end h-5">
        <span className="text-xs text-tfa-gray-400">
          {isDirty
            ? t('survey.saving', language)
            : useSurveyStore.getState().lastSavedAt
              ? t('survey.saved', language)
              : null}
        </span>
      </div>

      <div className="bg-white border border-tfa-gray-200 rounded shadow-card divide-y divide-tfa-gray-100">
        {allQuestions.map((question) => (
          <div key={question.id} className="px-6 py-5">
            <QuestionRenderer
              question={question}
              value={answers[question.id]}
              onChange={setAnswer}
              language={language}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleReview} size="lg">
          {language === 'ar' ? 'مراجعة الإجابات' : 'Review Answers'}
        </Button>
      </div>
    </div>
  )
}
