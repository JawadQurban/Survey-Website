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
import { ClipboardList, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react'

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
}

const EMPTY: SurveyForm = {
  slug: '', title_en: '', title_ar: '',
  desc_en: '', desc_ar: '',
  instructions_en: '', instructions_ar: '',
  is_active: true, skip_intro: false,
  show_role: true, show_sector: true, show_org_size: true,
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

        {/* Per-question intro toggles — only relevant when skip_intro is off */}
        {!form.skip_intro && (
          <div className="pl-6 space-y-2 border-l-2 border-tfa-gray-100">
            <p className="text-xs font-semibold text-tfa-gray-400 uppercase tracking-wide">Intro questions to show</p>
            {([
              { key: 'show_role',     label: 'Role question',              desc: 'CEO / CHRO / L&D — used for role-based question filtering' },
              { key: 'show_sector',   label: 'Sector question',            desc: 'Which sector are you currently operating in?' },
              { key: 'show_org_size', label: 'Organisation size question', desc: 'Number of employees in KSA' },
            ] as { key: keyof SurveyForm; label: string; desc: string }[]).map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-2 cursor-pointer select-none">
                <input type="checkbox"
                  checked={form[key] as boolean}
                  onChange={(e) => onChange({ [key]: e.target.checked })}
                  className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy mt-0.5" />
                <div>
                  <span className="text-sm text-tfa-gray-700 font-medium">{label}</span>
                  <p className="text-xs text-tfa-gray-400">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Create modal ─────────────────────────────────────────────────────────────
function CreateSurveyModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<SurveyForm>(EMPTY)
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: () => adminApi.createSurvey(toApiPayload(form, true)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-surveys'] }); onClose() },
    onError: (err: any) => setError(err?.response?.data?.detail ?? 'Failed to create survey'),
  })

  const handleSubmit = () => {
    if (!form.slug.trim())    return setError('Slug is required')
    if (!form.title_en.trim()) return setError('English title is required')
    setError('')
    mut.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded border border-tfa-gray-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-tfa-gray-800">New Survey</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-tfa-gray-100 text-tfa-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SurveyFormFields form={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} showSlug />
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
  const transEn = getTranslation(survey.translations, 'en')
  const transAr = getTranslation(survey.translations, 'ar')
  const settings = (survey as any).settings ?? {}

  const [form, setForm] = useState<SurveyForm>({
    slug:            survey.slug,
    title_en:        transEn?.title ?? '',
    title_ar:        transAr?.title ?? '',
    desc_en:         transEn?.description ?? '',
    desc_ar:         transAr?.description ?? '',
    instructions_en: transEn?.instructions ?? '',
    instructions_ar: transAr?.instructions ?? '',
    is_active:    survey.is_active,
    skip_intro:   Boolean(settings.skip_intro),
    show_role:    settings.show_role    !== false,
    show_sector:  settings.show_sector  !== false,
    show_org_size:settings.show_org_size !== false,
  })
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: () => adminApi.updateSurvey(survey.id, toApiPayload(form, false)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-surveys'] }); onClose() },
    onError: (err: any) => setError(err?.response?.data?.detail ?? 'Failed to save'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded border border-tfa-gray-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-tfa-gray-800">Edit Survey</h2>
            <p className="text-xs text-tfa-gray-400 font-mono">/{survey.slug}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-tfa-gray-100 text-tfa-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SurveyFormFields form={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
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
