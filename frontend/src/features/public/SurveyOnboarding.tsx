import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useLanguageStore } from '@/store/languageStore'
import { useSurveyStore } from '@/store/surveyStore'
import { publicApi } from '@/lib/api'
import type { RespondentRole, Sector, OrgSize } from '@/types/survey'

// ─── Sector Definitions ──────────────────────────────────────────────────────

const SECTORS: { key: Sector; badge: string; en: string; ar: string; subEn: string; subAr: string }[] = [
  { key: 'banks',          badge: 'B', en: 'Banks',                        ar: 'البنوك',                    subEn: 'Bank licensed by SAMA',               subAr: 'بنك مرخص من ساما' },
  { key: 'insurance',      badge: 'I', en: 'Insurance',                    ar: 'التأمين',                   subEn: 'Insurance / Reinsurance company',     subAr: 'شركة تأمين / إعادة تأمين' },
  { key: 'capital_market', badge: 'C', en: 'Capital Market / Investment',  ar: 'السوق المالية / الاستثمار', subEn: 'CMA-licensed company',                subAr: 'شركة مرخصة من هيئة السوق المالية' },
  { key: 'fintech',        badge: 'F', en: 'FinTech / Payments',           ar: 'الفنتك / المدفوعات',        subEn: 'Financial technology or payments co.', subAr: 'شركة تقنية مالية أو مدفوعات' },
  { key: 'financing',      badge: '$', en: 'Financing',                    ar: 'التمويل',                   subEn: 'Licensed financing company',          subAr: 'شركة تمويل مرخصة' },
  { key: 'regulatory',     badge: 'R', en: 'Regulatory Body',              ar: 'جهة تنظيمية',               subEn: 'SAMA / Capital Market / Insurance',   subAr: 'ساما / السوق المالية / التأمين' },
  { key: 'non_financial',  badge: 'N', en: 'Non-Financial Sector',         ar: 'قطاع غير مالي',             subEn: 'Non-financial sector company',        subAr: 'شركة من قطاع غير مالي' },
  { key: 'government',     badge: 'G', en: 'Government Body',              ar: 'جهة حكومية',                subEn: 'Ministry or government entity',       subAr: 'وزارة أو هيئة حكومية' },
]

const REGULATORS = [
  { key: 'sama', en: 'Saudi Central Bank (SAMA)',     ar: 'البنك المركزي السعودي (ساما)' },
  { key: 'cma',  en: 'Capital Market Authority (CMA)', ar: 'هيئة السوق المالية (CMA)' },
  { key: 'ia',   en: 'Insurance Authority (IA)',       ar: 'هيئة التأمين (IA)' },
  { key: 'other',en: 'Other regulatory body',          ar: 'جهة تنظيمية أخرى' },
]

const ORG_SIZES: { key: OrgSize; en: string; ar: string }[] = [
  { key: 'lt_50',     en: 'Less than 50 employees',    ar: 'أقل من 50 موظفاً' },
  { key: '50_249',    en: '50 – 249 employees',         ar: '50 – 249 موظفاً' },
  { key: '250_999',   en: '250 – 999 employees',        ar: '250 – 999 موظفاً' },
  { key: '1000_4999', en: '1,000 – 4,999 employees',   ar: '1,000 – 4,999 موظفاً' },
  { key: 'gte_5000',  en: '5,000 employees or more',   ar: '5,000 موظف فأكثر' },
]

const ROLES: { key: RespondentRole; en: string; ar: string; descEn: string; descAr: string }[] = [
  { key: 'ceo',  en: 'CEO / Executive',  ar: 'الرئيس التنفيذي / القيادة', descEn: 'C-suite executive or board level', descAr: 'قيادة تنفيذية أو مجلس إدارة' },
  { key: 'chro', en: 'CHRO',             ar: 'مدير الموارد البشرية',       descEn: 'Head of Human Capital / HR',       descAr: 'رئيس الموارد البشرية / رأس المال البشري' },
  { key: 'ld',   en: 'L&D Manager',      ar: 'مدير التعلم والتطوير',       descEn: 'Head of Learning & Development',   descAr: 'رئيس التعلم والتطوير' },
]

const SECTORS_NO_REGULATOR = new Set<Sector>(['government', 'non_financial'])

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepBadge({ step, total, isRTL }: { step: number; total: number; isRTL: boolean }) {
  return (
    <div className={`flex items-center gap-2 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-tfa-navy text-white text-sm font-bold shrink-0">
        {step}
      </span>
      <span className="text-sm font-medium text-tfa-gray-600">
        {isRTL
          ? `القسم ${step} من ${total} — قبل البدء`
          : `Step ${step} of ${total} — Before You Begin`}
      </span>
    </div>
  )
}

function InfoBox({ children, isRTL }: { children: React.ReactNode; isRTL: boolean }) {
  return (
    <div className={`flex gap-3 bg-tfa-navy/5 border border-tfa-navy/20 rounded p-4 mb-6 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
      <div className="shrink-0 w-5 h-5 rounded-full bg-tfa-navy text-white flex items-center justify-center text-xs font-bold mt-0.5">i</div>
      <p className="text-sm text-tfa-gray-700 leading-relaxed">{children}</p>
    </div>
  )
}

function FieldLabel({ required, optional, children, isRTL }: { required?: boolean; optional?: boolean; children: React.ReactNode; isRTL: boolean }) {
  return (
    <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <span className={`text-sm font-medium text-tfa-gray-700 ${isRTL ? 'text-right' : ''}`}>{children}</span>
      {required && <span className="text-red-500 text-sm">*</span>}
      {optional && (
        <span className="text-xs px-1.5 py-0.5 rounded border border-tfa-gray-300 text-tfa-gray-500">
          {isRTL ? 'اختياري' : 'optional'}
        </span>
      )}
    </div>
  )
}

function SectorCard({
  sector, selected, isRTL, onClick,
}: {
  sector: typeof SECTORS[number]
  selected: boolean
  isRTL: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 w-full border rounded p-3 text-left transition-all ${
        isRTL ? 'flex-row-reverse text-right' : ''
      } ${
        selected
          ? 'border-tfa-navy bg-tfa-navy/5 ring-1 ring-tfa-navy'
          : 'border-tfa-gray-200 bg-white hover:border-tfa-gray-400'
      }`}
    >
      <span
        className={`shrink-0 w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
          selected ? 'bg-tfa-navy text-white' : 'bg-tfa-gray-100 text-tfa-gray-600'
        }`}
      >
        {sector.badge}
      </span>
      <div>
        <p className={`text-sm font-semibold ${selected ? 'text-tfa-navy' : 'text-tfa-gray-800'}`}>
          {isRTL ? sector.ar : sector.en}
        </p>
        <p className="text-xs text-tfa-gray-500 mt-0.5">{isRTL ? sector.subAr : sector.subEn}</p>
      </div>
    </button>
  )
}

function RoleCard({
  role, selected, isRTL, onClick,
}: {
  role: typeof ROLES[number]
  selected: boolean
  isRTL: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 w-full border rounded p-4 text-left transition-all ${
        isRTL ? 'flex-row-reverse text-right' : ''
      } ${
        selected
          ? 'border-tfa-navy bg-tfa-navy/5 ring-1 ring-tfa-navy'
          : 'border-tfa-gray-200 bg-white hover:border-tfa-gray-400'
      }`}
    >
      <span
        className={`shrink-0 w-9 h-9 rounded flex items-center justify-center text-xs font-bold ${
          selected ? 'bg-tfa-navy text-white' : 'bg-tfa-gray-100 text-tfa-gray-600'
        }`}
      >
        {role.key.toUpperCase()}
      </span>
      <div>
        <p className={`text-sm font-semibold ${selected ? 'text-tfa-navy' : 'text-tfa-gray-800'}`}>
          {isRTL ? role.ar : role.en}
        </p>
        <p className="text-xs text-tfa-gray-500 mt-0.5">{isRTL ? role.descAr : role.descEn}</p>
      </div>
    </button>
  )
}

const SELECT_CLS =
  'w-full rounded border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy bg-white'

// ─── Main Component ───────────────────────────────────────────────────────────

export function SurveyOnboarding() {
  const { surveySlug } = useParams<{ surveySlug: string }>()
  const navigate = useNavigate()
  const { isRTL } = useLanguageStore()
  const { setSession } = useSurveyStore()

  const [step, setStep] = useState<1 | 2>(1)
  const [error, setError] = useState('')

  // Step 1 fields
  const [orgName, setOrgName] = useState('')
  const [sector, setSector] = useState<Sector | ''>('')
  const [regulator, setRegulator] = useState('')
  const [orgSize, setOrgSize] = useState<OrgSize | ''>('')

  // Step 2 fields
  const [respondentName, setRespondentName] = useState('')
  const [respondentEmail, setRespondentEmail] = useState('')
  const [role, setRole] = useState<RespondentRole | ''>('')

  const needsRegulator = sector !== '' && !SECTORS_NO_REGULATOR.has(sector as Sector)

  const beginMutation = useMutation({
    mutationFn: () =>
      publicApi.beginSurvey(surveySlug!, {
        org_name: orgName || null,
        sector: sector as string,
        regulator: needsRegulator ? regulator || null : null,
        org_size: orgSize as string,
        respondent_name: respondentName || null,
        respondent_email: respondentEmail || null,
        role: role as string,
      }),
    onSuccess: () => {
      setSession({
        surveySlug: surveySlug!,
        respondentRole: role as RespondentRole,
        organizationName: orgName || null,
        sector: sector as string,
        regulator: regulator || null,
        orgSize: orgSize as string,
        respondentName: respondentName || null,
        respondentEmail: respondentEmail || null,
      })
      navigate(`/survey/${surveySlug}/overview`)
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setError(err.response?.data?.detail ?? (isRTL ? 'حدث خطأ. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.'))
    },
  })

  const handleStep1Next = () => {
    if (!sector) return setError(isRTL ? 'يرجى اختيار القطاع' : 'Please select your sector')
    if (!orgSize) return setError(isRTL ? 'يرجى اختيار حجم المنشأة' : 'Please select your organization size')
    if (needsRegulator && !regulator) return setError(isRTL ? 'يرجى اختيار الجهة التنظيمية' : 'Please select your regulatory body')
    setError('')
    setStep(2)
  }

  const handleSubmit = () => {
    if (!role) return setError(isRTL ? 'يرجى اختيار نوع دورك' : 'Please select your role')
    setError('')
    beginMutation.mutate()
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in" dir={isRTL ? 'rtl' : 'ltr'}>
      {step === 1 ? (
        <>
          <StepBadge step={1} total={3} isRTL={isRTL} />

          <h1 className="text-2xl font-bold text-tfa-gray-800 mb-2">
            {isRTL ? 'بيانات الجهة' : 'Organization Data'}
          </h1>
          <p className="text-sm text-tfa-gray-500 mb-6">
            {isRTL
              ? 'تُستخدم البيانات لتخصيص الأسئلة المعروضة وضمان دقة التحليل القطاعي.'
              : 'This information tailors the questions shown and ensures accurate sector-level analysis.'}
          </p>

          <InfoBox isRTL={isRTL}>
            {isRTL
              ? 'اسم الجهة اختياري. اختيارهم لعدم الإفصاح عن اسم الجهة لن يؤثر على قبول مشاركتكم في التحليل. القطاع وحجم المنشأة هما الحقلان الإلزاميان لتفعيل الأسئلة المناسبة.'
              : 'Organization name is optional — omitting it will not affect your participation. Sector and size are the two mandatory fields for activating the appropriate questions.'}
          </InfoBox>

          {error && <Alert variant="error" className="mb-4">{error}</Alert>}

          {/* Org Name */}
          <div className="mb-6">
            <FieldLabel optional isRTL={isRTL}>{isRTL ? 'اسم الجهة' : 'Organization Name'}</FieldLabel>
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder={isRTL ? 'يمكنكم ترك الحقل فارغاً للمشاركة المجهولة' : 'Leave blank for anonymous participation'}
            />
          </div>

          {/* Sector */}
          <div className="mb-6">
            <FieldLabel required isRTL={isRTL}>{isRTL ? 'القطاع' : 'Sector'}</FieldLabel>
            <div className="grid grid-cols-2 gap-3">
              {SECTORS.map((s) => (
                <SectorCard
                  key={s.key}
                  sector={s}
                  selected={sector === s.key}
                  isRTL={isRTL}
                  onClick={() => {
                    setSector(s.key)
                    setRegulator('')
                    setError('')
                  }}
                />
              ))}
            </div>
          </div>

          {/* Conditional: Regulator */}
          {needsRegulator && (
            <div className="mb-6">
              <p className="text-xs text-tfa-gray-500 mb-2 flex items-center gap-1">
                <span>↓</span>
                {isRTL ? 'سؤال شرطي يظهر بناءً على إجابتك' : 'A conditional question based on your answer'}
              </p>
              <FieldLabel required isRTL={isRTL}>{isRTL ? 'حدد الجهة التنظيمية' : 'Select Regulatory Body'}</FieldLabel>
              <select
                className={SELECT_CLS}
                value={regulator}
                onChange={(e) => setRegulator(e.target.value)}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value="">{isRTL ? '— اختر —' : '— Select —'}</option>
                {REGULATORS.map((r) => (
                  <option key={r.key} value={r.key}>{isRTL ? r.ar : r.en}</option>
                ))}
              </select>
            </div>
          )}

          {/* Org Size */}
          <div className="mb-8">
            <FieldLabel required isRTL={isRTL}>
              {isRTL ? 'حجم المنشأة (عدد الموظفين في المملكة)' : 'Organization Size (employees in KSA)'}
            </FieldLabel>
            <div className="space-y-2">
              {ORG_SIZES.map((s) => (
                <label
                  key={s.key}
                  className={`flex items-center justify-between w-full border rounded p-3 cursor-pointer transition-all ${
                    orgSize === s.key
                      ? 'border-tfa-navy bg-tfa-navy/5'
                      : 'border-tfa-gray-200 hover:border-tfa-gray-400'
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
                    onChange={() => setOrgSize(s.key)}
                    className="accent-tfa-navy"
                  />
                </label>
              ))}
            </div>
          </div>

          <Button className="w-full" onClick={handleStep1Next}>
            {isRTL ? 'التالي' : 'Next'}
          </Button>
        </>
      ) : (
        <>
          <StepBadge step={2} total={3} isRTL={isRTL} />

          <h1 className="text-2xl font-bold text-tfa-gray-800 mb-2">
            {isRTL ? 'هوية المشارك' : 'Respondent Identity'}
          </h1>
          <p className="text-sm text-tfa-gray-500 mb-6">
            {isRTL
              ? 'ستُحدد الأسئلة المعروضة بناءً على دورك.'
              : 'Questions will adapt based on your role to ensure relevance.'}
          </p>

          <InfoBox isRTL={isRTL}>
            {isRTL
              ? 'الاسم والبريد الإلكتروني اختياريان. إذا أدرجتهما، سنرسل لك رابط استئناف ونسخة PDF من إجاباتك. عدم إدراجهما لن يؤثر على مشاركتك.'
              : 'Name and email are optional. If provided, we will send you a resume link and a PDF copy of your answers. Not providing them does not affect your participation.'}
          </InfoBox>

          {error && <Alert variant="error" className="mb-4">{error}</Alert>}

          <div className="space-y-5 mb-6">
            <div>
              <FieldLabel optional isRTL={isRTL}>{isRTL ? 'الاسم الكامل' : 'Full Name'}</FieldLabel>
              <Input
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder={isRTL ? 'يمكن تركه فارغاً' : 'May be left blank'}
              />
            </div>

            <div>
              <FieldLabel optional isRTL={isRTL}>{isRTL ? 'البريد الإلكتروني الرسمي' : 'Official Email'}</FieldLabel>
              <Input
                type="email"
                value={respondentEmail}
                onChange={(e) => setRespondentEmail(e.target.value)}
                placeholder={isRTL ? 'name@organization.sa (اختياري)' : 'name@organization.sa (optional)'}
              />
              <p className="text-xs text-tfa-gray-500 mt-1">
                {isRTL
                  ? 'إذا قُدِّم، سنرسل رابط الاستئناف ونسخة PDF. عدم تقديمه لا يؤثر على المشاركة.'
                  : 'If provided, we send the resume link and a PDF copy of your answers. Not providing it does not affect participation.'}
              </p>
            </div>
          </div>

          {/* Role selection */}
          <div className="mb-8">
            <FieldLabel required isRTL={isRTL}>{isRTL ? 'نوع الدور' : 'Role Type'}</FieldLabel>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ROLES.map((r) => (
                <RoleCard
                  key={r.key}
                  role={r}
                  selected={role === r.key}
                  isRTL={isRTL}
                  onClick={() => { setRole(r.key); setError('') }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => { setStep(1); setError('') }} className="flex-1">
              {isRTL ? 'رجوع' : 'Back'}
            </Button>
            <Button
              onClick={handleSubmit}
              loading={beginMutation.isPending}
              className="flex-1"
            >
              {isRTL ? 'ابدأ الأسئلة' : 'Start Questions'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
