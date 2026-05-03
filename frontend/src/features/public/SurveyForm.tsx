import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { PageSpinner } from '@/components/ui/Spinner'
import { QuestionRenderer } from '@/components/survey/QuestionRenderer'
import { useLanguageStore } from '@/store/languageStore'
import { useSurveyStore } from '@/store/surveyStore'
import { publicApi } from '@/lib/api'
import { t } from '@/lib/i18n'
import type { Survey, RespondentRole } from '@/types/survey'
import type { AxiosError } from 'axios'

const AUTOSAVE_INTERVAL_MS = 30_000

// Sent to keep older backend versions happy (field is ignored once server restarts).
const SECTOR_REGULATOR: Record<string, string> = {
  banking:         'sama',
  insurance:       'ia',
  capital_markets: 'cma',
  payments:        'sama',
  financing:       'sama',
}

// ─── Intro question data ──────────────────────────────────────────────────────

const SECTORS = [
  { key: 'banking',         badge: 'B', en: 'Banking',        ar: 'الخدمات المصرفية' },
  { key: 'insurance',       badge: 'I', en: 'Insurance',      ar: 'تأمين' },
  { key: 'capital_markets', badge: 'C', en: 'Capital Markets',ar: 'أسواق رأس المال' },
  { key: 'payments',        badge: 'P', en: 'Payments',       ar: 'المدفوعات' },
  { key: 'financing',       badge: 'F', en: 'Financing',      ar: 'التمويل' },
  { key: 'other',           badge: 'O', en: 'Other',          ar: 'أخرى (يرجى التحديد)' },
]

const ORG_SIZES = [
  { key: 'lt_50',     en: 'Less than 50 employees',  ar: 'أقل من 50 موظف' },
  { key: '50_249',    en: '50 – 249 employees',       ar: '50 – 249 موظف' },
  { key: '250_999',   en: '250 – 999 employees',      ar: '250 – 999 موظف' },
  { key: '1000_4999', en: '1,000 – 4,999 employees', ar: '1,000 – 4,999 موظف' },
  { key: 'gte_5000',  en: '5,000 employees or more', ar: '5,000+ موظف' },
  { key: 'other',     en: 'Other (please specify)',   ar: 'أخرى (يرجى التحديد)' },
]

const ROLES = [
  { key: 'ceo',  badge: 'CEO',  en: 'CEO / Executive', ar: 'الرئيس التنفيذي / مستوى تنفيذي', descEn: 'C-suite executive or board level', descAr: 'قيادة تنفيذية أو مجلس إدارة' },
  { key: 'chro', badge: 'CHRO', en: 'CHRO',            ar: 'رئيس قسم الموارد البشرية',        descEn: 'Head of Human Capital / HR',        descAr: 'رئيس الموارد البشرية / رأس المال البشري' },
  { key: 'ld',   badge: 'LD',   en: 'L&D Manager',     ar: 'التعلم والتطوير',                 descEn: 'Head of Learning & Development',    descAr: 'رئيس التعلم والتطوير' },
]

// ─── Intro form (sector / org size / role) ────────────────────────────────────

interface IntroFormProps {
  onBegin: (sector: string, orgSize: string, role: string) => void
  loading: boolean
  externalError: string
  isRTL: boolean
}

function IntroForm({ onBegin, loading, externalError, isRTL }: IntroFormProps) {
  const [role,            setRole]            = useState('')
  const [sector,          setSector]          = useState('')
  const [otherSectorText, setOtherSectorText] = useState('')
  const [orgSize,         setOrgSize]         = useState('')
  const [otherOrgText,    setOtherOrgText]    = useState('')
  const [error,           setError]           = useState('')

  const handleSubmit = () => {
    if (!role)    return setError(isRTL ? 'يرجى اختيار دورك'         : 'Please select your role')
    if (!sector)  return setError(isRTL ? 'يرجى اختيار القطاع'       : 'Please select your sector')
    if (sector === 'other' && !otherSectorText.trim())
      return setError(isRTL ? 'يرجى تحديد قطاعك'                     : 'Please specify your sector')
    if (!orgSize) return setError(isRTL ? 'يرجى اختيار حجم المنشأة'  : 'Please select your organization size')
    if (orgSize === 'other' && !otherOrgText.trim())
      return setError(isRTL ? 'يرجى تحديد حجم منشأتك'                : 'Please specify your organization size')
    setError('')
    onBegin(sector, orgSize, role)
  }

  const displayError = error || externalError

  return (
    <div className="bg-white border border-tfa-gray-200 rounded shadow-card divide-y divide-tfa-gray-100">

      {/* Q1: Role — shown first per Excel section 0 order */}
      <div className="px-6 py-5">
        <p className="text-sm font-semibold text-tfa-gray-800 mb-1">
          {isRTL
            ? 'ما هو الوصف الأنسب لدورك الحالي داخل المنظمة؟'
            : 'What best describes your current role within the organization?'}
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

      {/* Q2: Sector */}
      <div className="px-6 py-5">
        <p className="text-sm font-semibold text-tfa-gray-800 mb-1">
          {isRTL ? 'في أي قطاع تعملون حالياً؟' : 'Which sector are you currently operating in?'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
          {SECTORS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => { setSector(s.key); setOtherSectorText(''); setError('') }}
              className={`flex items-center gap-2 w-full border rounded p-3 transition-all ${
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
              <p className={`text-sm font-semibold ${sector === s.key ? 'text-tfa-navy' : 'text-tfa-gray-800'}`}>
                {isRTL ? s.ar : s.en}
              </p>
            </button>
          ))}
        </div>
        {sector === 'other' && (
          <div className="mt-3">
            <input
              type="text"
              autoFocus
              className="w-full rounded border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
              placeholder={isRTL ? 'يرجى تحديد قطاعك' : 'Please specify your sector'}
              value={otherSectorText}
              onChange={(e) => { setOtherSectorText(e.target.value); setError('') }}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        )}
      </div>

      {/* Q3: Org Size */}
      <div className="px-6 py-5">
        <p className="text-sm font-semibold text-tfa-gray-800 mb-1">
          {isRTL
            ? 'ما حجم مؤسستك من حيث عدد الموظفين في المملكة العربية السعودية؟'
            : 'What is the size of your organization in terms of number of employees in KSA?'}
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
                onChange={() => { setOrgSize(s.key); setOtherOrgText(''); setError('') }}
                className="accent-tfa-navy"
              />
            </label>
          ))}
        </div>
        {orgSize === 'other' && (
          <div className="mt-3">
            <input
              type="text"
              autoFocus
              className="w-full rounded border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
              placeholder={isRTL ? 'يرجى تحديد حجم منشأتك' : 'Please specify your organization size'}
              value={otherOrgText}
              onChange={(e) => { setOtherOrgText(e.target.value); setError('') }}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>
        )}
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
  const [showModal, setShowModal] = useState(false)

  // respondentRole is included in the key so a role change always triggers a fresh fetch,
  // preventing a stale 401-error cache from blocking the new session's request.
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['survey-questions', surveySlug, language, respondentRole],
    queryFn:  () => publicApi.getSurveyQuestions(surveySlug!, language),
    enabled:  !!respondentRole && !!surveySlug,
    retry:    false,
    staleTime: 0,
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

  const unanswered = allQuestions.filter((q) => {
    if (!q.is_required) return false
    const ans = answers[q.id]
    if (!ans) return true
    if (q.question_type === 'single_choice' || q.question_type === 'multiple_choice')
      return !ans.selected_option_keys?.length
    if (q.question_type === 'number')
      return ans.numeric_value === undefined || ans.numeric_value === null
    return !ans.open_text_value?.trim()
  })

  const handleReview = () => {
    if (unanswered.length > 0) {
      setShowModal(true)
      return
    }
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
        {allQuestions.map((question, idx) => (
          <div key={question.id} className="px-6 py-5">
            <QuestionRenderer
              question={question}
              questionNumber={idx + 1}
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

      <Modal
        open={showModal}
        title={language === 'ar' ? 'يرجى الإجابة على جميع الأسئلة المطلوبة' : 'Please answer all required questions'}
        onClose={() => setShowModal(false)}
      >
        <p>
          {language === 'ar'
            ? `لم تتم الإجابة على ${unanswered.length} سؤال مطلوب. يرجى العودة والإجابة على جميع الأسئلة قبل المتابعة.`
            : `${unanswered.length} required question${unanswered.length === 1 ? '' : 's'} ${unanswered.length === 1 ? 'has' : 'have'} not been answered. Please go back and complete all questions before proceeding.`}
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-tfa-gray-500">
          {unanswered.slice(0, 5).map((q) => {
            const text = q.translations.find((tr) => tr.language_code === language)?.text
              ?? q.translations[0]?.text ?? ''
            return (
              <li key={q.id} className="truncate">{text}</li>
            )
          })}
          {unanswered.length > 5 && (
            <li className="text-tfa-gray-400">
              {language === 'ar' ? `و ${unanswered.length - 5} أخرى...` : `and ${unanswered.length - 5} more...`}
            </li>
          )}
        </ul>
      </Modal>
    </div>
  )
}
