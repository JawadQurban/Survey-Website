import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { adminApi } from '@/lib/api'
import { Check, Copy, ExternalLink, Pencil, Plus, Trash2, X } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface FormConfig {
  id:             number
  slug:           string
  title_en:       string
  title_ar:       string | null
  description_en: string | null
  description_ar: string | null
  is_active:      boolean
  created_at:     string
}

const INPUT = 'w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy'
const TA    = `${INPUT} resize-none`
const LABEL = 'text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide mb-1 block'

// ── Modal ─────────────────────────────────────────────────────────────────────
function ConfigModal({ config, onClose }: { config?: FormConfig; onClose: () => void }) {
  const [form, setForm] = useState({
    slug:           config?.slug           ?? '',
    title_en:       config?.title_en       ?? '',
    title_ar:       config?.title_ar       ?? '',
    description_en: config?.description_en ?? '',
    description_ar: config?.description_ar ?? '',
    is_active:      config?.is_active      ?? true,
  })
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: () => config
      ? adminApi.updateGroupRegConfig(config.id, {
          title_en:       form.title_en       || undefined,
          title_ar:       form.title_ar       || undefined,
          description_en: form.description_en || undefined,
          description_ar: form.description_ar || undefined,
          is_active:      form.is_active,
        })
      : adminApi.createGroupRegConfig({
          slug:           form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
          title_en:       form.title_en,
          title_ar:       form.title_ar       || undefined,
          description_en: form.description_en || undefined,
          description_ar: form.description_ar || undefined,
          is_active:      form.is_active,
        }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gr-configs'] }); onClose() },
    onError:   (err: any) => setError(err?.response?.data?.detail ?? 'Failed to save'),
  })

  const submit = () => {
    if (!form.title_en.trim()) return setError('English title is required')
    if (!config && !form.slug.trim()) return setError('Slug is required')
    setError('')
    mut.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded border border-tfa-gray-200 shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-tfa-gray-800">
            {config ? 'Edit Registration Form' : 'New Registration Form'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-tfa-gray-100 text-tfa-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {!config && (
            <div>
              <label className={LABEL}>URL Slug <span className="text-red-400">*</span></label>
              <input className={`${INPUT} font-mono`} value={form.slug}
                placeholder="e.g. group-reg-2026"
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} />
              <p className="text-xs text-tfa-gray-400 mt-1">
                Public URL: <span className="font-mono">/group-registration/{form.slug || '…'}</span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Title (EN) <span className="text-red-400">*</span></label>
              <input className={INPUT} value={form.title_en} placeholder="Group Registration Form"
                onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} />
            </div>
            <div>
              <label className={LABEL}>Title (AR)</label>
              <input className={INPUT} dir="rtl" value={form.title_ar} placeholder="نموذج التسجيل الجماعي"
                onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Description (EN)</label>
              <textarea className={TA} rows={3} value={form.description_en}
                placeholder="Shown on the landing page"
                onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))} />
            </div>
            <div>
              <label className={LABEL}>Description (AR)</label>
              <textarea className={TA} rows={3} dir="rtl" value={form.description_ar}
                placeholder="يظهر في صفحة البداية"
                onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy" />
            <span className="text-sm font-medium text-tfa-gray-700">Active — form is open for submissions</span>
          </label>
        </div>

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        <div className="flex gap-2 pt-4">
          <Button onClick={submit} loading={mut.isPending} className="flex-1">
            {config ? 'Save Changes' : 'Create Form'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Copy Link Button ──────────────────────────────────────────────────────────
function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/group-registration/${slug}`

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex items-center gap-2 bg-tfa-gray-50 border border-tfa-gray-200 rounded px-3 py-2 mt-2">
      <span className="text-xs font-mono text-tfa-gray-500 flex-1 truncate">{url}</span>
      <button onClick={copy}
        className="flex items-center gap-1 text-xs font-medium text-tfa-navy hover:text-tfa-navy/70 shrink-0">
        {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <a href={`/group-registration/${slug}`} target="_blank" rel="noreferrer"
        className="text-tfa-gray-400 hover:text-tfa-navy">
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function GroupRegistrationForms() {
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing]       = useState<FormConfig | null>(null)
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
        <ConfigModal
          config={editing ?? undefined}
          onClose={() => { setShowCreate(false); setEditing(null) }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tfa-gray-800">Registration Forms</h1>
          <p className="text-sm text-tfa-gray-500 mt-1">
            Create and manage shareable group registration form links
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New Form
        </Button>
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
                    <Badge variant={cfg.is_active ? 'success' : 'default'}>
                      {cfg.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {cfg.title_ar && (
                    <p className="text-sm text-tfa-gray-400" dir="rtl">{cfg.title_ar}</p>
                  )}
                  {cfg.description_en && (
                    <p className="text-xs text-tfa-gray-500 mt-1 leading-relaxed">{cfg.description_en}</p>
                  )}
                  <CopyLinkButton slug={cfg.slug} />
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(cfg)}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Button>
                  <button
                    onClick={() => {
                      if (!window.confirm(`Delete "${cfg.title_en}"? This cannot be undone.`)) return
                      deleteMut.mutate(cfg.id)
                    }}
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
