import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { adminApi } from '@/lib/api'
import type { Survey } from '@/types/survey'
import { getTranslation } from '@/lib/i18n'
import { Check, ChevronDown, ChevronUp, ClipboardList, ExternalLink, Link2, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { IntroOption, IntroQuestionConfig, LandingInfoCard, SurveyIntroConfig, SurveyLandingConfig } from '@/types/survey'

// ─── Default intro configs (mirrors SurveyForm.tsx constants) ────────────────
const DEFAULT_ROLE_CONFIG: IntroQuestionConfig = {
  text_en: 'What best describes your current role within the organization?',
  text_ar: 'ما هو الوصف الأنسب لدورك الحالي داخل المنظمة؟',
  options: [
    { key: 'ceo',  badge: 'CEO',  label_en: 'CEO / Executive', label_ar: 'الرئيس التنفيذي / مستوى تنفيذي', desc_en: 'C-suite executive or board level',  desc_ar: 'قيادة تنفيذية أو مجلس إدارة' },
    { key: 'chro', badge: 'CHRO', label_en: 'CHRO',            label_ar: 'رئيس قسم الموارد البشرية',        desc_en: 'Head of Human Capital / HR',        desc_ar: 'رئيس الموارد البشرية / رأس المال البشري' },
    { key: 'ld',   badge: 'LD',   label_en: 'L&D Manager',     label_ar: 'التعلم والتطوير',                 desc_en: 'Head of Learning & Development',    desc_ar: 'رئيس التعلم والتطوير' },
  ],
}

const DEFAULT_SECTOR_CONFIG: IntroQuestionConfig = {
  text_en: 'Which sector are you currently operating in?',
  text_ar: 'في أي قطاع تعملون حالياً؟',
  options: [
    { key: 'banking',         badge: 'B', label_en: 'Banking',        label_ar: 'الخدمات المصرفية' },
    { key: 'insurance',       badge: 'I', label_en: 'Insurance',      label_ar: 'تأمين' },
    { key: 'capital_markets', badge: 'C', label_en: 'Capital Markets', label_ar: 'أسواق رأس المال' },
    { key: 'payments',        badge: 'P', label_en: 'Payments',       label_ar: 'المدفوعات' },
    { key: 'financing',       badge: 'F', label_en: 'Financing',      label_ar: 'التمويل' },
    { key: 'other',           badge: 'O', label_en: 'Other',          label_ar: 'أخرى (يرجى التحديد)' },
  ],
}

const DEFAULT_ORG_SIZE_CONFIG: IntroQuestionConfig = {
  text_en: 'What is the size of your organization in terms of number of employees in KSA?',
  text_ar: 'ما حجم مؤسستك من حيث عدد الموظفين في المملكة العربية السعودية؟',
  options: [
    { key: 'lt_50',     label_en: 'Less than 50 employees',  label_ar: 'أقل من 50 موظف' },
    { key: '50_249',    label_en: '50 – 249 employees',       label_ar: '50 – 249 موظف' },
    { key: '250_999',   label_en: '250 – 999 employees',      label_ar: '250 – 999 موظف' },
    { key: '1000_4999', label_en: '1,000 – 4,999 employees', label_ar: '1,000 – 4,999 موظف' },
    { key: 'gte_5000',  label_en: '5,000 employees or more', label_ar: '5,000+ موظف' },
    { key: 'other',     label_en: 'Other (please specify)',   label_ar: 'أخرى (يرجى التحديد)' },
  ],
}

const EMPTY_INTRO_CONFIG: SurveyIntroConfig = {
  role:     { ...DEFAULT_ROLE_CONFIG,     options: DEFAULT_ROLE_CONFIG.options?.map((o) => ({ ...o })) },
  sector:   { ...DEFAULT_SECTOR_CONFIG,   options: DEFAULT_SECTOR_CONFIG.options?.map((o) => ({ ...o })) },
  org_size: { ...DEFAULT_ORG_SIZE_CONFIG, options: DEFAULT_ORG_SIZE_CONFIG.options?.map((o) => ({ ...o })) },
}

// ─── Landing page defaults ────────────────────────────────────────────────────
interface LandingForm {
  hero_subtitle_en: string
  hero_subtitle_ar: string
  cta_text_en:      string
  cta_text_ar:      string
  show_info_cards:  boolean
  info_cards:       LandingInfoCard[]
}

const DEFAULT_LANDING_CARDS: LandingInfoCard[] = [
  { icon: '5-10', label_en: 'minutes approx.',   label_ar: 'دقائق تقريباً', desc_en: 'Survey completion time',                desc_ar: 'وقت إتمام الاستطلاع' },
  { icon: '3',    label_en: 'roles',              label_ar: 'أدوار',         desc_en: 'CEO, CHRO, L&D Leader',                 desc_ar: 'الرئيس التنفيذي، مدير الموارد البشرية، قائد التعلم' },
  { icon: '100%', label_en: 'confidential',       label_ar: 'سري',           desc_en: 'Your data is protected and aggregated', desc_ar: 'بياناتك محمية ومجمّعة' },
]

const EMPTY_LANDING: LandingForm = {
  hero_subtitle_en: '',
  hero_subtitle_ar: '',
  cta_text_en:      'Begin Survey',
  cta_text_ar:      'ابدأ الاستطلاع',
  show_info_cards:  true,
  info_cards:       DEFAULT_LANDING_CARDS.map((c) => ({ ...c })),
}

function landingFromConfig(lc?: SurveyLandingConfig | null): LandingForm {
  return {
    hero_subtitle_en: lc?.hero_subtitle_en ?? '',
    hero_subtitle_ar: lc?.hero_subtitle_ar ?? '',
    cta_text_en:      lc?.cta_text_en      ?? 'Begin Survey',
    cta_text_ar:      lc?.cta_text_ar      ?? 'ابدأ الاستطلاع',
    show_info_cards:  lc?.show_info_cards  ?? true,
    info_cards:       lc?.info_cards?.length ? lc.info_cards.map((c) => ({ ...c })) : DEFAULT_LANDING_CARDS.map((c) => ({ ...c })),
  }
}

// ─── Shared field styles ──────────────────────────────────────────────────────
const INPUT = 'w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy'
const LABEL = 'text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide mb-1 block'
const TA    = `${INPUT} resize-none`

// ─── Shared form state ────────────────────────────────────────────────────────
interface SurveyForm {
  slug:             string
  title_en:         string
  title_ar:         string
  desc_en:          string
  desc_ar:          string
  instructions_en:  string
  instructions_ar:  string
  is_active:        boolean
  skip_intro:       boolean
  show_role:        boolean
  show_sector:      boolean
  show_org_size:    boolean
  intro_config:     SurveyIntroConfig
  landing:          LandingForm
}

const EMPTY: SurveyForm = {
  slug: '', title_en: '', title_ar: '',
  desc_en: '', desc_ar: '',
  instructions_en: '', instructions_ar: '',
  is_active: true, skip_intro: false,
  show_role: true, show_sector: true, show_org_size: true,
  intro_config: JSON.parse(JSON.stringify(EMPTY_INTRO_CONFIG)),
  landing: JSON.parse(JSON.stringify(EMPTY_LANDING)),
}

function toApiPayload(form: SurveyForm, includeSlug = true) {
  const payload: Record<string, unknown> = {
    is_active:  form.is_active,
    is_fs_only: false,
    settings: {
      skip_intro:    form.skip_intro,
      show_role:     form.show_role,
      show_sector:   form.show_sector,
      show_org_size: form.show_org_size,
      intro_config:  form.intro_config,
      landing_config: {
        hero_subtitle_en: form.landing.hero_subtitle_en || undefined,
        hero_subtitle_ar: form.landing.hero_subtitle_ar || undefined,
        cta_text_en:      form.landing.cta_text_en      || undefined,
        cta_text_ar:      form.landing.cta_text_ar      || undefined,
        show_info_cards:  form.landing.show_info_cards,
        info_cards:       form.landing.info_cards,
      },
    },
    translations: [
      {
        language_code: 'en',
        title:        form.title_en.trim(),
        description:  form.desc_en.trim() || null,
        instructions: form.instructions_en.trim() || null,
      },
      ...(form.title_ar.trim() ? [{
        language_code: 'ar',
        title:        form.title_ar.trim(),
        description:  form.desc_ar.trim() || null,
        instructions: form.instructions_ar.trim() || null,
      }] : []),
    ],
  }
  if (includeSlug) payload.slug = form.slug.trim()
  return payload
}

// ─── Intro question editor ────────────────────────────────────────────────────
function IntroQuestionEditor({
  qKey, config, onChange, lockOptions,
}: {
  qKey: keyof SurveyIntroConfig
  config: IntroQuestionConfig
  onChange: (c: IntroQuestionConfig) => void
  lockOptions?: boolean   // role options are fixed (can edit labels, not add/remove)
}) {
  const [open, setOpen] = useState(false)

  const updateOption = (idx: number, patch: Partial<IntroOption>) => {
    const opts = [...(config.options ?? [])]
    opts[idx] = { ...opts[idx], ...patch }
    onChange({ ...config, options: opts })
  }

  const addOption = () => {
    const opts = [...(config.options ?? []), { key: `opt_${Date.now()}`, badge: '', label_en: '', label_ar: '' }]
    onChange({ ...config, options: opts })
  }

  const removeOption = (idx: number) => {
    const opts = (config.options ?? []).filter((_, i) => i !== idx)
    onChange({ ...config, options: opts })
  }

  const hasBadge = qKey === 'role' || qKey === 'sector'

  return (
    <div className="border border-tfa-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-tfa-gray-50 hover:bg-tfa-gray-100 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-tfa-gray-600 uppercase tracking-wide">
          {qKey === 'role' ? 'Role question' : qKey === 'sector' ? 'Sector question' : 'Organisation size question'}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-tfa-gray-400" /> : <ChevronDown className="h-4 w-4 text-tfa-gray-400" />}
      </button>

      {open && (
        <div className="px-4 py-4 space-y-4 bg-white">
          {/* Question text */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Question text (EN)</label>
              <input className={INPUT} value={config.text_en}
                onChange={(e) => onChange({ ...config, text_en: e.target.value })} />
            </div>
            <div>
              <label className={LABEL}>Question text (AR)</label>
              <input className={INPUT} dir="rtl" value={config.text_ar}
                onChange={(e) => onChange({ ...config, text_ar: e.target.value })} />
            </div>
          </div>

          {/* Options */}
          <div>
            <label className={LABEL}>Options</label>
            <div className="space-y-2">
              {(config.options ?? []).map((opt, idx) => (
                <div key={opt.key + idx} className="flex items-start gap-2 bg-tfa-gray-50 p-2 rounded">
                  {hasBadge && (
                    <input
                      className="w-14 rounded border border-tfa-gray-300 px-2 py-1.5 text-xs text-center font-mono focus:outline-none focus:ring-1 focus:ring-tfa-navy"
                      placeholder="Badge"
                      value={opt.badge ?? ''}
                      disabled={lockOptions}
                      onChange={(e) => updateOption(idx, { badge: e.target.value })}
                    />
                  )}
                  <input className="flex-1 rounded border border-tfa-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-tfa-navy"
                    placeholder="Label EN" value={opt.label_en}
                    onChange={(e) => updateOption(idx, { label_en: e.target.value })} />
                  <input className="flex-1 rounded border border-tfa-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-tfa-navy"
                    dir="rtl" placeholder="Label AR" value={opt.label_ar}
                    onChange={(e) => updateOption(idx, { label_ar: e.target.value })} />
                  {qKey === 'role' && (
                    <>
                      <input className="flex-1 rounded border border-tfa-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-tfa-navy"
                        placeholder="Description EN" value={opt.desc_en ?? ''}
                        onChange={(e) => updateOption(idx, { desc_en: e.target.value })} />
                      <input className="flex-1 rounded border border-tfa-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-tfa-navy"
                        dir="rtl" placeholder="Description AR" value={opt.desc_ar ?? ''}
                        onChange={(e) => updateOption(idx, { desc_ar: e.target.value })} />
                    </>
                  )}
                  {!lockOptions && (
                    <button type="button" onClick={() => removeOption(idx)}
                      className="p-1 rounded hover:bg-red-50 text-tfa-gray-300 hover:text-red-500 shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {!lockOptions && (
              <button type="button" onClick={addOption}
                className="mt-2 text-xs text-tfa-navy hover:underline flex items-center gap-1">
                <Plus className="h-3 w-3" /> Add option
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Landing page form fields ─────────────────────────────────────────────────
function LandingPageFormFields({ form, onChange, slug }: {
  form:     LandingForm
  onChange: (patch: Partial<LandingForm>) => void
  slug?:    string
}) {
  const [copied, setCopied] = useState(false)

  const updateCard = (idx: number, patch: Partial<LandingInfoCard>) => {
    const cards = [...form.info_cards]
    cards[idx] = { ...cards[idx], ...patch }
    onChange({ info_cards: cards })
  }

  const surveyUrl = slug ? `${window.location.origin}/survey/${slug}` : null

  const copyLink = () => {
    if (!surveyUrl) return
    navigator.clipboard.writeText(surveyUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-5">
      {/* Survey link */}
      {surveyUrl && (
        <div className="flex items-center gap-2 bg-tfa-gray-50 border border-tfa-gray-200 rounded-lg px-3 py-2.5">
          <span className="text-xs text-tfa-gray-500 flex-1 font-mono truncate">{surveyUrl}</span>
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-1.5 text-xs font-medium text-tfa-navy hover:text-tfa-navy/70 shrink-0 transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link2 className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      )}

      {/* Subtitle */}
      <div>
        <p className={`${LABEL} mb-2`}>Hero Subtitle <span className="text-tfa-gray-300 font-normal">(optional — shown below the title)</span></p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Subtitle (EN)</label>
            <input className={INPUT} placeholder="e.g. The Financial Academy Strategy Refresh"
              value={form.hero_subtitle_en}
              onChange={(e) => onChange({ hero_subtitle_en: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Subtitle (AR)</label>
            <input className={INPUT} dir="rtl" placeholder="العنوان الفرعي"
              value={form.hero_subtitle_ar}
              onChange={(e) => onChange({ hero_subtitle_ar: e.target.value })} />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div>
        <p className={`${LABEL} mb-2`}>Call-to-Action Button</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Button Text (EN)</label>
            <input className={INPUT} placeholder="Begin Survey"
              value={form.cta_text_en}
              onChange={(e) => onChange({ cta_text_en: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Button Text (AR)</label>
            <input className={INPUT} dir="rtl" placeholder="ابدأ الاستطلاع"
              value={form.cta_text_ar}
              onChange={(e) => onChange({ cta_text_ar: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className={LABEL}>Info Cards</p>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.show_info_cards}
              onChange={(e) => onChange({ show_info_cards: e.target.checked })}
              className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy" />
            <span className="text-xs text-tfa-gray-600">Show on landing page</span>
          </label>
        </div>

        {form.show_info_cards && (
          <div className="space-y-3">
            {form.info_cards.map((card, idx) => (
              <div key={idx} className="border border-tfa-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex gap-2">
                  <div className="w-20">
                    <label className={LABEL}>Icon</label>
                    <input className={INPUT} placeholder="5-10" value={card.icon}
                      onChange={(e) => updateCard(idx, { icon: e.target.value })} />
                  </div>
                  <div className="flex-1">
                    <label className={LABEL}>Label (EN)</label>
                    <input className={INPUT} placeholder="minutes approx." value={card.label_en}
                      onChange={(e) => updateCard(idx, { label_en: e.target.value })} />
                  </div>
                  <div className="flex-1">
                    <label className={LABEL}>Label (AR)</label>
                    <input className={INPUT} dir="rtl" placeholder="دقائق" value={card.label_ar}
                      onChange={(e) => updateCard(idx, { label_ar: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={LABEL}>Description (EN)</label>
                    <input className={INPUT} placeholder="Survey completion time" value={card.desc_en}
                      onChange={(e) => updateCard(idx, { desc_en: e.target.value })} />
                  </div>
                  <div>
                    <label className={LABEL}>Description (AR)</label>
                    <input className={INPUT} dir="rtl" placeholder="وقت إتمام الاستطلاع" value={card.desc_ar}
                      onChange={(e) => updateCard(idx, { desc_ar: e.target.value })} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Reusable form fields ─────────────────────────────────────────────────────
function SurveyFormFields({ form, onChange, showSlug = false }: {
  form: SurveyForm
  onChange: (patch: Partial<SurveyForm>) => void
  showSlug?: boolean
}) {
  return (
    <div className="space-y-4">
      {showSlug && (
        <div>
          <label className={LABEL}>Slug <span className="text-red-400">*</span></label>
          <input
            className={`${INPUT} font-mono`}
            placeholder="e.g. tfa-benchmark-2026"
            value={form.slug}
            onChange={(e) => onChange({ slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
          />
          <p className="text-xs text-tfa-gray-400 mt-1">Used in the URL: /survey/<strong>{form.slug || '…'}</strong>/start</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Title (EN) <span className="text-red-400">*</span></label>
          <input className={INPUT} placeholder="Survey title in English" value={form.title_en}
            onChange={(e) => onChange({ title_en: e.target.value })} />
        </div>
        <div>
          <label className={LABEL}>Title (AR)</label>
          <input className={INPUT} dir="rtl" placeholder="عنوان الاستبيان بالعربية" value={form.title_ar}
            onChange={(e) => onChange({ title_ar: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Description (EN)</label>
          <textarea className={TA} rows={3} placeholder="Shown on the landing page" value={form.desc_en}
            onChange={(e) => onChange({ desc_en: e.target.value })} />
        </div>
        <div>
          <label className={LABEL}>Description (AR)</label>
          <textarea className={TA} rows={3} dir="rtl" placeholder="يظهر في صفحة البداية" value={form.desc_ar}
            onChange={(e) => onChange({ desc_ar: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Instructions (EN)</label>
          <textarea className={TA} rows={2} placeholder="Shown before starting" value={form.instructions_en}
            onChange={(e) => onChange({ instructions_en: e.target.value })} />
        </div>
        <div>
          <label className={LABEL}>Instructions (AR)</label>
          <textarea className={TA} rows={2} dir="rtl" placeholder="تظهر قبل البدء" value={form.instructions_ar}
            onChange={(e) => onChange({ instructions_ar: e.target.value })} />
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1 border-t border-tfa-gray-100">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={form.is_active}
            onChange={(e) => onChange({ is_active: e.target.checked })}
            className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy" />
          <span className="text-sm text-tfa-gray-700 font-medium">Active — visible to respondents</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={form.skip_intro}
            onChange={(e) => onChange({ skip_intro: e.target.checked })}
            className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy" />
          <div>
            <span className="text-sm text-tfa-gray-700 font-medium">Skip all intro questions</span>
            <p className="text-xs text-tfa-gray-400">
              Go directly to survey questions without any intro. All questions shown, no role filtering.
            </p>
          </div>
        </label>

        {/* Per-question intro toggles + editors */}
        {!form.skip_intro && (
          <div className="pl-6 space-y-3 border-l-2 border-tfa-gray-100">
            <p className="text-xs font-semibold text-tfa-gray-400 uppercase tracking-wide">Intro questions to show</p>

            {/* Role */}
            <div>
              <label className="flex items-start gap-2 cursor-pointer select-none mb-2">
                <input type="checkbox" checked={form.show_role}
                  onChange={(e) => onChange({ show_role: e.target.checked })}
                  className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy mt-0.5" />
                <div>
                  <span className="text-sm text-tfa-gray-700 font-medium">Role question</span>
                  <p className="text-xs text-tfa-gray-400">CEO / CHRO / L&D — used for role-based question filtering</p>
                </div>
              </label>
              {form.show_role && (
                <IntroQuestionEditor
                  qKey="role"
                  config={form.intro_config.role ?? DEFAULT_ROLE_CONFIG}
                  lockOptions
                  onChange={(c) => onChange({ intro_config: { ...form.intro_config, role: c } })}
                />
              )}
            </div>

            {/* Sector */}
            <div>
              <label className="flex items-start gap-2 cursor-pointer select-none mb-2">
                <input type="checkbox" checked={form.show_sector}
                  onChange={(e) => onChange({ show_sector: e.target.checked })}
                  className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy mt-0.5" />
                <div>
                  <span className="text-sm text-tfa-gray-700 font-medium">Sector question</span>
                  <p className="text-xs text-tfa-gray-400">Which sector are you currently operating in?</p>
                </div>
              </label>
              {form.show_sector && (
                <IntroQuestionEditor
                  qKey="sector"
                  config={form.intro_config.sector ?? DEFAULT_SECTOR_CONFIG}
                  onChange={(c) => onChange({ intro_config: { ...form.intro_config, sector: c } })}
                />
              )}
            </div>

            {/* Org size */}
            <div>
              <label className="flex items-start gap-2 cursor-pointer select-none mb-2">
                <input type="checkbox" checked={form.show_org_size}
                  onChange={(e) => onChange({ show_org_size: e.target.checked })}
                  className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy mt-0.5" />
                <div>
                  <span className="text-sm text-tfa-gray-700 font-medium">Organisation size question</span>
                  <p className="text-xs text-tfa-gray-400">Number of employees in KSA</p>
                </div>
              </label>
              {form.show_org_size && (
                <IntroQuestionEditor
                  qKey="org_size"
                  config={form.intro_config.org_size ?? DEFAULT_ORG_SIZE_CONFIG}
                  onChange={(c) => onChange({ intro_config: { ...form.intro_config, org_size: c } })}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Create modal ─────────────────────────────────────────────────────────────
function CreateSurveyModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<SurveyForm>(EMPTY)
  const [tab, setTab]   = useState<'details' | 'landing'>('details')
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: () => adminApi.createSurvey(toApiPayload(form, true)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-surveys'] })
      qc.invalidateQueries({ queryKey: ['active-surveys'] })
      onClose()
    },
    onError: (err: any) => setError(err?.response?.data?.detail ?? 'Failed to create survey'),
  })

  const handleSubmit = () => {
    if (!form.slug.trim())     return setError('Slug is required')
    if (!form.title_en.trim()) return setError('English title is required')
    setError('')
    mut.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded border border-tfa-gray-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-tfa-gray-800">New Survey</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-tfa-gray-100 text-tfa-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-tfa-gray-200 mb-5 -mx-6 px-6">
          {(['details', 'landing'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t ? 'border-tfa-navy text-tfa-navy' : 'border-transparent text-tfa-gray-500 hover:text-tfa-gray-700'
              }`}>
              {t === 'details' ? 'Survey Details' : 'Landing Page'}
            </button>
          ))}
        </div>

        {tab === 'details' && (
          <SurveyFormFields form={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} showSlug />
        )}
        {tab === 'landing' && (
          <LandingPageFormFields
            form={form.landing}
            onChange={(p) => setForm((f) => ({ ...f, landing: { ...f.landing, ...p } }))}
            slug={form.slug.trim() || undefined}
          />
        )}

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSubmit} loading={mut.isPending} className="flex-1">Create Survey</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit modal ───────────────────────────────────────────────────────────────
function EditSurveyModal({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  const transEn  = getTranslation(survey.translations, 'en')
  const transAr  = getTranslation(survey.translations, 'ar')
  const settings = (survey as any).settings ?? {}

  const [tab, setTab] = useState<'details' | 'landing'>('details')
  const [form, setForm] = useState<SurveyForm>({
    slug:            survey.slug,
    title_en:        transEn?.title ?? '',
    title_ar:        transAr?.title ?? '',
    desc_en:         transEn?.description ?? '',
    desc_ar:         transAr?.description ?? '',
    instructions_en: transEn?.instructions ?? '',
    instructions_ar: transAr?.instructions ?? '',
    is_active:     survey.is_active,
    skip_intro:    Boolean(settings.skip_intro),
    show_role:     settings.show_role     !== false,
    show_sector:   settings.show_sector   !== false,
    show_org_size: settings.show_org_size !== false,
    intro_config: {
      role:     settings.intro_config?.role     ?? JSON.parse(JSON.stringify(DEFAULT_ROLE_CONFIG)),
      sector:   settings.intro_config?.sector   ?? JSON.parse(JSON.stringify(DEFAULT_SECTOR_CONFIG)),
      org_size: settings.intro_config?.org_size ?? JSON.parse(JSON.stringify(DEFAULT_ORG_SIZE_CONFIG)),
    },
    landing: landingFromConfig(settings.landing_config),
  })
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: () => adminApi.updateSurvey(survey.id, toApiPayload(form, false)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-surveys'] })
      qc.invalidateQueries({ queryKey: ['active-surveys'] })
      qc.invalidateQueries({ queryKey: ['survey-landing'] })
      onClose()
    },
    onError: (err: any) => setError(err?.response?.data?.detail ?? 'Failed to save'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded border border-tfa-gray-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-tfa-gray-800">Edit Survey</h2>
            <p className="text-xs text-tfa-gray-400 font-mono">/{survey.slug}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-tfa-gray-100 text-tfa-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-tfa-gray-200 mb-5 -mx-6 px-6">
          {(['details', 'landing'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t ? 'border-tfa-navy text-tfa-navy' : 'border-transparent text-tfa-gray-500 hover:text-tfa-gray-700'
              }`}>
              {t === 'details' ? 'Survey Details' : 'Landing Page'}
            </button>
          ))}
        </div>

        {tab === 'details' && (
          <SurveyFormFields form={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
        )}
        {tab === 'landing' && (
          <LandingPageFormFields
            form={form.landing}
            onChange={(p) => setForm((f) => ({ ...f, landing: { ...f.landing, ...p } }))}
            slug={survey.slug}
          />
        )}

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        <div className="flex gap-2 pt-4">
          <Button onClick={() => mut.mutate()} loading={mut.isPending} className="flex-1">Save Changes</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Surveys() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/survey/${slug}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSlug(slug)
      setTimeout(() => setCopiedSlug((s) => s === slug ? null : s), 2000)
    })
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-surveys'],
    queryFn: () => adminApi.listSurveys(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteSurvey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-surveys'] }),
  })

  if (isLoading) return <PageSpinner />

  const surveys = (data?.data as Survey[]) ?? []

  return (
    <div className="space-y-6">
      {showCreate    && <CreateSurveyModal onClose={() => setShowCreate(false)} />}
      {editingSurvey && <EditSurveyModal survey={editingSurvey} onClose={() => setEditingSurvey(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tfa-gray-800">Surveys</h1>
          <p className="text-sm text-tfa-gray-500 mt-1">{surveys.length} surveys configured</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Survey
        </Button>
      </div>

      {surveys.length === 0 && (
        <div className="text-center py-12 text-tfa-gray-400">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No surveys yet. Click "New Survey" to get started.</p>
        </div>
      )}

      <div className="space-y-3">
        {surveys.map((s) => {
          const titleEn = getTranslation(s.translations, 'en')?.title ?? s.slug
          const titleAr = getTranslation(s.translations, 'ar')?.title
          const descEn  = getTranslation(s.translations, 'en')?.description
          const skipIntro = Boolean((s as any).settings?.skip_intro)

          return (
            <Card key={s.id}>
              <CardBody className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-tfa-gray-900">{titleEn}</p>
                    <Badge variant={s.is_active ? 'success' : 'default'}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {skipIntro && <Badge variant="info">No Intro</Badge>}
                  </div>
                  {titleAr && <p className="text-sm text-tfa-gray-400 mt-0.5" dir="rtl">{titleAr}</p>}
                  {descEn   && <p className="text-xs text-tfa-gray-500 mt-1 leading-relaxed">{descEn}</p>}
                  <p className="text-xs text-tfa-gray-400 mt-1 font-mono">/{s.slug}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => copyLink(s.slug)}>
                    {copiedSlug === s.slug
                      ? <><Check className="h-4 w-4 text-green-500" /> Copied!</>
                      : <><Link2 className="h-4 w-4" /> Copy Link</>}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingSurvey(s)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <Button variant="secondary" size="sm"
                    onClick={() => navigate(`/admin/surveys/${s.id}/builder`)}>
                    <ExternalLink className="h-4 w-4" /> Builder
                  </Button>
                  <button
                    onClick={() => {
                      if (!window.confirm(`Delete "${titleEn}"? This cannot be undone.`)) return
                      deleteMutation.mutate(s.id)
                    }}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-tfa-gray-300 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
