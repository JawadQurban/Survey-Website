import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { adminApi } from '@/lib/api'
import type { FormConfig, FormSettings } from '@/types/groupRegistration'
import { Check, Copy, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react'

// ── Shared styles ─────────────────────────────────────────────────────────────
const INPUT = 'w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy'
const TA    = `${INPUT} resize-none`
const LABEL = 'text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide mb-1 block'

// ── Default settings ──────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: Required<FormSettings> = {
  cta_text_en:    'Start Registration',
  cta_text_ar:    'بدء التسجيل',
  show_info_cards: true,
  info_cards: [
    { icon: '4',   label_en: 'Sectors',        label_ar: 'قطاعات',                desc_en: 'Business, Support, Operations, Control', desc_ar: 'الأعمال، الدعم، العمليات، الرقابة' },
    { icon: '60+', label_en: 'Courses',         label_ar: 'دورة تدريبية',          desc_en: 'Across 18 functional areas',             desc_ar: 'عبر 18 مجالاً وظيفياً' },
    { icon: '25',  label_en: 'Max per cohort',  label_ar: 'الحد الأقصى لكل دفعة', desc_en: 'Participants per program delivery',       desc_ar: 'مشارك لكل تنفيذ برنامج' },
  ],
  pdpl_text_en: 'I hereby confirm that all information provided in this form is accurate and complete. I also authorize the Financial Academy to use, analyze, and securely store this data in accordance with the Personal Data Protection Law (PDPL) of the Kingdom of Saudi Arabia.',
  pdpl_text_ar: 'أقر بأن جميع المعلومات المقدمة في هذا النموذج دقيقة وكاملة. كما أفوّض الأكاديمية المالية باستخدام هذه البيانات وتحليلها وتخزينها بأمان وفقاً لنظام حماية البيانات الشخصية (PDPL) في المملكة العربية السعودية.',
  delivery_modes: ['Blended', 'In-Person', 'Virtual'],
  submit_text_en: 'Submit – Digital Approval',
  submit_text_ar: 'إرسال – الموافقة الرقمية',
}

function mergeSettings(s: FormSettings | null | undefined): Required<FormSettings> {
  return { ...DEFAULT_SETTINGS, ...(s ?? {}), info_cards: s?.info_cards ?? DEFAULT_SETTINGS.info_cards }
}

// ── Config Modal ──────────────────────────────────────────────────────────────
function ConfigModal({ config, onClose }: { config?: FormConfig; onClose: () => void }) {
  const [tab, setTab] = useState<'basic' | 'landing' | 'form'>('basic')
  const [error, setError] = useState('')
  const qc = useQueryClient()

  // Basic fields
  const [slug,          setSlug]          = useState(config?.slug           ?? '')
  const [titleEn,       setTitleEn]       = useState(config?.title_en       ?? '')
  const [titleAr,       setTitleAr]       = useState(config?.title_ar       ?? '')
  const [descEn,        setDescEn]        = useState(config?.description_en ?? '')
  const [descAr,        setDescAr]        = useState(config?.description_ar ?? '')
  const [isActive,      setIsActive]      = useState(config?.is_active      ?? true)

  // Settings
  const s = mergeSettings(config?.settings)
  const [ctaEn,         setCtaEn]         = useState(s.cta_text_en)
  const [ctaAr,         setCtaAr]         = useState(s.cta_text_ar)
  const [showCards,     setShowCards]     = useState(s.show_info_cards)
  const [infoCards,     setInfoCards]     = useState(s.info_cards.map(c => ({ ...c })))
  const [pdplEn,        setPdplEn]        = useState(s.pdpl_text_en)
  const [pdplAr,        setPdplAr]        = useState(s.pdpl_text_ar)
  const [deliveryModes, setDeliveryModes] = useState<string[]>(s.delivery_modes)
  const [submitEn,      setSubmitEn]      = useState(s.submit_text_en)
  const [submitAr,      setSubmitAr]      = useState(s.submit_text_ar)
  const [newMode,       setNewMode]       = useState('')

  const updateCard = (idx: number, key: string, val: string) => {
    const cards = [...infoCards]
    cards[idx] = { ...cards[idx], [key]: val }
    setInfoCards(cards)
  }

  const buildPayload = () => ({
    title_en:       titleEn,
    title_ar:       titleAr       || undefined,
    description_en: descEn        || undefined,
    description_ar: descAr        || undefined,
    is_active:      isActive,
    settings: {
      cta_text_en:    ctaEn,
      cta_text_ar:    ctaAr,
      show_info_cards: showCards,
      info_cards:     infoCards,
      pdpl_text_en:   pdplEn,
      pdpl_text_ar:   pdplAr,
      delivery_modes: deliveryModes,
      submit_text_en: submitEn,
      submit_text_ar: submitAr,
    },
  })

  const mut = useMutation({
    mutationFn: () => config
      ? adminApi.updateGroupRegConfig(config.id, buildPayload())
      : adminApi.createGroupRegConfig({ slug: slug.trim().toLowerCase().replace(/\s+/g, '-'), ...buildPayload() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gr-configs'] }); onClose() },
    onError:   (err: any) => setError(err?.response?.data?.detail ?? 'Failed to save'),
  })

  const submit = () => {
    if (!titleEn.trim()) return setError('English title is required')
    if (!config && !slug.trim()) return setError('Slug is required')
    setError('')
    mut.mutate()
  }

  const tabs = [
    { id: 'basic',   label: 'Basic' },
    { id: 'landing', label: 'Landing Page' },
    { id: 'form',    label: 'Form Settings' },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded border border-tfa-gray-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-tfa-gray-800">
            {config ? 'Edit Form' : 'New Registration Form'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-tfa-gray-100 text-tfa-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-tfa-gray-200 mb-5 -mx-6 px-6">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id ? 'border-tfa-navy text-tfa-navy' : 'border-transparent text-tfa-gray-500 hover:text-tfa-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Basic ─────────────────────────────────────────────────────── */}
        {tab === 'basic' && (
          <div className="space-y-4">
            {!config && (
              <div>
                <label className={LABEL}>URL Slug <span className="text-red-400">*</span></label>
                <input className={`${INPUT} font-mono`} value={slug} placeholder="e.g. group-reg-2026"
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
                <p className="text-xs text-tfa-gray-400 mt-1">
                  Public URL: <span className="font-mono">/group-registration/{slug || '…'}</span>
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Title (EN) <span className="text-red-400">*</span></label>
                <input className={INPUT} value={titleEn} placeholder="Group Registration Form"
                  onChange={(e) => setTitleEn(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Title (AR)</label>
                <input className={INPUT} dir="rtl" value={titleAr} placeholder="نموذج التسجيل الجماعي"
                  onChange={(e) => setTitleAr(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL}>Description (EN)</label>
                <textarea className={TA} rows={3} value={descEn} placeholder="Shown on the landing page"
                  onChange={(e) => setDescEn(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Description (AR)</label>
                <textarea className={TA} rows={3} dir="rtl" value={descAr} placeholder="يظهر في صفحة البداية"
                  onChange={(e) => setDescAr(e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy" />
              <span className="text-sm font-medium text-tfa-gray-700">Active — form is open for submissions</span>
            </label>
          </div>
        )}

        {/* ── Tab: Landing Page ──────────────────────────────────────────────── */}
        {tab === 'landing' && (
          <div className="space-y-5">
            <div>
              <p className={`${LABEL} mb-2`}>Call-to-Action Button Text</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>EN</label>
                  <input className={INPUT} value={ctaEn} placeholder="Start Registration"
                    onChange={(e) => setCtaEn(e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>AR</label>
                  <input className={INPUT} dir="rtl" value={ctaAr} placeholder="بدء التسجيل"
                    onChange={(e) => setCtaAr(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className={LABEL}>Info Cards</p>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={showCards} onChange={(e) => setShowCards(e.target.checked)}
                    className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy" />
                  <span className="text-xs text-tfa-gray-600">Show on landing</span>
                </label>
              </div>
              {showCards && infoCards.map((card, i) => (
                <div key={i} className="border border-tfa-gray-200 rounded-lg p-3 mb-2 space-y-2">
                  <div className="flex gap-2">
                    <div className="w-20">
                      <label className={LABEL}>Icon</label>
                      <input className={INPUT} value={card.icon} placeholder="4"
                        onChange={(e) => updateCard(i, 'icon', e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <label className={LABEL}>Label (EN)</label>
                      <input className={INPUT} value={card.label_en} placeholder="Sectors"
                        onChange={(e) => updateCard(i, 'label_en', e.target.value)} />
                    </div>
                    <div className="flex-1">
                      <label className={LABEL}>Label (AR)</label>
                      <input className={INPUT} dir="rtl" value={card.label_ar}
                        onChange={(e) => updateCard(i, 'label_ar', e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={LABEL}>Description (EN)</label>
                      <input className={INPUT} value={card.desc_en}
                        onChange={(e) => updateCard(i, 'desc_en', e.target.value)} />
                    </div>
                    <div>
                      <label className={LABEL}>Description (AR)</label>
                      <input className={INPUT} dir="rtl" value={card.desc_ar}
                        onChange={(e) => updateCard(i, 'desc_ar', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: Form Settings ─────────────────────────────────────────────── */}
        {tab === 'form' && (
          <div className="space-y-5">
            <div>
              <p className={`${LABEL} mb-2`}>Submit Button Text</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>EN</label>
                  <input className={INPUT} value={submitEn} placeholder="Submit – Digital Approval"
                    onChange={(e) => setSubmitEn(e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>AR</label>
                  <input className={INPUT} dir="rtl" value={submitAr}
                    onChange={(e) => setSubmitAr(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <p className={`${LABEL} mb-2`}>Delivery Modes</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {deliveryModes.map((m) => (
                  <div key={m} className="flex items-center gap-1 bg-tfa-gray-100 px-2 py-1 rounded text-sm">
                    {m}
                    <button onClick={() => setDeliveryModes((prev) => prev.filter((x) => x !== m))}
                      className="text-tfa-gray-400 hover:text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input className={INPUT} value={newMode} placeholder="Add delivery mode"
                  onChange={(e) => setNewMode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newMode.trim()) {
                      setDeliveryModes((p) => [...p, newMode.trim()])
                      setNewMode('')
                    }
                  }} />
                <Button size="sm" variant="secondary" onClick={() => {
                  if (newMode.trim()) { setDeliveryModes((p) => [...p, newMode.trim()]); setNewMode('') }
                }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <p className={`${LABEL} mb-2`}>PDPL Authorization Text</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>EN</label>
                  <textarea className={TA} rows={5} value={pdplEn}
                    onChange={(e) => setPdplEn(e.target.value)} />
                </div>
                <div>
                  <label className={LABEL}>AR</label>
                  <textarea className={TA} rows={5} dir="rtl" value={pdplAr}
                    onChange={(e) => setPdplAr(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        <div className="flex gap-2 pt-5">
          <Button onClick={submit} loading={mut.isPending} className="flex-1">
            {config ? 'Save Changes' : 'Create Form'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Copy Link ─────────────────────────────────────────────────────────────────
function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/group-registration/${slug}`
  const copy = () => {
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }
  return (
    <div className="flex items-center gap-2 bg-tfa-gray-50 border border-tfa-gray-200 rounded px-3 py-2 mt-2">
      <span className="text-xs font-mono text-tfa-gray-500 flex-1 truncate">{url}</span>
      <button onClick={copy} className="flex items-center gap-1 text-xs font-medium text-tfa-navy hover:text-tfa-navy/70 shrink-0">
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <a href={`/group-registration/${slug}`} target="_blank" rel="noreferrer" className="text-tfa-gray-400 hover:text-tfa-navy">
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function GroupRegistrationForms() {
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<FormConfig | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['gr-configs'],
    queryFn:  () => adminApi.listGroupRegConfigs(),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => adminApi.deleteGroupRegConfig(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['gr-configs'] }),
  })

  if (isLoading) return <PageSpinner />
  const configs: FormConfig[] = data?.data ?? []

  return (
    <div className="space-y-6">
      {(showCreate || editing) && (
        <ConfigModal config={editing ?? undefined} onClose={() => { setShowCreate(false); setEditing(null) }} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tfa-gray-800">Registration Forms</h1>
          <p className="text-sm text-tfa-gray-500 mt-1">Create and manage shareable group registration form links</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> New Form</Button>
      </div>

      {configs.length === 0 && (
        <div className="text-center py-16 text-tfa-gray-400 border border-dashed border-tfa-gray-200 rounded-lg">
          <p className="font-medium mb-1">No forms created yet</p>
          <p className="text-sm">Click "New Form" to create your first shareable registration link.</p>
        </div>
      )}

      <div className="space-y-4">
        {configs.map((cfg) => (
          <Card key={cfg.id}>
            <CardBody>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-semibold text-tfa-gray-900">{cfg.title_en}</p>
                    <Badge variant={cfg.is_active ? 'success' : 'default'}>{cfg.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  {cfg.title_ar && <p className="text-sm text-tfa-gray-400" dir="rtl">{cfg.title_ar}</p>}
                  {cfg.description_en && <p className="text-xs text-tfa-gray-500 mt-1">{cfg.description_en}</p>}
                  <CopyLinkButton slug={cfg.slug} />
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(cfg)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <button
                    onClick={() => { if (!window.confirm(`Delete "${cfg.title_en}"?`)) return; deleteMut.mutate(cfg.id) }}
                    className="p-1.5 rounded hover:bg-red-50 text-tfa-gray-300 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
