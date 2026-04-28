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
import { ClipboardList, ExternalLink, Plus, Trash2, X } from 'lucide-react'

interface CreateForm {
  slug: string
  title_en: string
  title_ar: string
  is_active: boolean
}

const EMPTY_FORM: CreateForm = { slug: '', title_en: '', title_ar: '', is_active: true }

function CreateSurveyModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createSurvey({
        slug: form.slug.trim(),
        is_active: form.is_active,
        is_fs_only: false,
        translations: [
          { language_code: 'en', title: form.title_en.trim() },
          ...(form.title_ar.trim() ? [{ language_code: 'ar', title: form.title_ar.trim() }] : []),
        ],
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-surveys'] })
      onClose()
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail ?? 'Failed to create survey')
    },
  })

  const handleSubmit = () => {
    if (!form.slug.trim()) return setError('Slug is required')
    if (!form.title_en.trim()) return setError('English title is required')
    setError('')
    createMutation.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded border border-tfa-gray-200 shadow-modal w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-tfa-gray-800">New Survey</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-tfa-gray-100 text-tfa-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide mb-1 block">
              Slug <span className="text-red-400">*</span>
            </label>
            <input
              className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy font-mono"
              placeholder="e.g. tfa-benchmark-2026"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide mb-1 block">
              English Title <span className="text-red-400">*</span>
            </label>
            <input
              className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
              placeholder="Survey title in English"
              value={form.title_en}
              onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide mb-1 block">
              Arabic Title
            </label>
            <input
              className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
              dir="rtl"
              placeholder="عنوان الاستبيان بالعربية"
              value={form.title_ar}
              onChange={(e) => setForm((f) => ({ ...f, title_ar: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy"
            />
            <span className="text-sm text-tfa-gray-700 font-medium">Active (visible to respondents)</span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button onClick={handleSubmit} loading={createMutation.isPending} className="flex-1">
              Create Survey
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Surveys() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-surveys'],
    queryFn: () => adminApi.listSurveys(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteSurvey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-surveys'] }),
  })

  const handleDelete = (s: Survey) => {
    const titleEn = getTranslation(s.translations, 'en')?.title ?? s.slug
    if (!window.confirm(`Delete survey "${titleEn}"? This cannot be undone.`)) return
    deleteMutation.mutate(s.id)
  }

  if (isLoading) return <PageSpinner />

  const surveys = (data?.data as Survey[]) ?? []

  return (
    <div className="space-y-6">
      {showCreate && <CreateSurveyModal onClose={() => setShowCreate(false)} />}

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
          <p>No surveys yet. Create one above or run the seed script to import from Excel.</p>
        </div>
      )}

      <div className="space-y-3">
        {surveys.map((s) => {
          const titleEn = getTranslation(s.translations, 'en')?.title ?? s.slug
          const titleAr = getTranslation(s.translations, 'ar')?.title

          return (
            <Card key={s.id}>
              <CardBody className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-tfa-gray-900">{titleEn}</p>
                    <Badge variant={s.is_active ? 'success' : 'default'}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {s.is_fs_only && <Badge variant="info">FS Only</Badge>}
                  </div>
                  {titleAr && <p className="text-sm text-tfa-gray-400 mt-0.5" dir="rtl">{titleAr}</p>}
                  <p className="text-xs text-tfa-gray-400 mt-1">/{s.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/admin/surveys/${s.id}/builder`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Builder
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(s)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
