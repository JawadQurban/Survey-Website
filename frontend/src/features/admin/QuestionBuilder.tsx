import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { getTranslation } from '@/lib/i18n'
import { PageSpinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Survey, Question } from '@/types/survey'
import { ArrowLeft, ChevronDown, ChevronRight, Save, X } from 'lucide-react'

const ROLES = [
  { key: 'ceo', label: 'CEO' },
  { key: 'chro', label: 'CHRO' },
  { key: 'ld', label: 'L&D' },
] as const

const TYPE_LABELS: Record<string, string> = {
  single_choice: 'Single',
  multiple_choice: 'Multi',
  open_text: 'Open Text',
  textarea: 'Text Area',
  number: 'Number',
  rating: 'Rating',
}

interface EditForm {
  text_en: string
  text_ar: string
  roles: string[]
}

export function QuestionBuilder() {
  const { surveyId } = useParams<{ surveyId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())
  const [editForm, setEditForm] = useState<EditForm>({ text_en: '', text_ar: '', roles: [] })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-survey', surveyId],
    queryFn: () => adminApi.getSurvey(Number(surveyId)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: object }) =>
      adminApi.updateQuestion(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-survey', surveyId] })
      setEditingId(null)
    },
  })

  if (isLoading) return <PageSpinner />

  const survey = data?.data as Survey
  if (!survey) return null

  const titleEn = getTranslation(survey.translations, 'en')?.title ?? survey.slug

  const startEdit = (q: Question) => {
    setEditingId(q.id)
    setEditForm({
      text_en: getTranslation(q.translations, 'en')?.text ?? '',
      text_ar: getTranslation(q.translations, 'ar')?.text ?? '',
      roles: q.visibility_rules.map((r) => r.role),
    })
  }

  const toggleRole = (role: string) => {
    setEditForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }))
  }

  const saveEdit = (q: Question) => {
    updateMutation.mutate({
      id: q.id,
      payload: {
        section_id: q.section_id,
        question_key: q.question_key,
        question_type: q.question_type,
        display_order: q.display_order,
        is_required: q.is_required,
        has_open_text_option: q.has_open_text_option,
        open_text_label_en: q.open_text_label_en,
        open_text_label_ar: q.open_text_label_ar,
        module: q.module,
        visible_to_roles: editForm.roles,
        translations: [
          { language_code: 'en', text: editForm.text_en },
          { language_code: 'ar', text: editForm.text_ar },
        ],
      },
    })
  }

  const toggleSection = (id: number) => {
    setExpandedSections((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalQuestions = survey.sections?.reduce((n, s) => n + (s.questions?.length ?? 0), 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/surveys')}
          className="p-1.5 rounded-lg hover:bg-tfa-gray-100 text-tfa-gray-400 hover:text-tfa-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-tfa-navy">Question Editor</h1>
          <p className="text-sm text-tfa-gray-500">
            {titleEn} · {survey.sections?.length ?? 0} sections · {totalQuestions} questions
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {survey.sections?.map((section) => {
          const sTitle = getTranslation(section.translations, 'en')?.title ?? section.section_key
          const expanded = expandedSections.has(section.id)

          return (
            <div key={section.id} className="border border-tfa-gray-200 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 bg-tfa-gray-50 hover:bg-tfa-gray-100 text-left"
                onClick={() => toggleSection(section.id)}
              >
                <div>
                  <p className="font-semibold text-tfa-gray-900">{sTitle}</p>
                  <p className="text-xs text-tfa-gray-400 mt-0.5">{section.questions?.length ?? 0} questions</p>
                </div>
                {expanded
                  ? <ChevronDown className="h-4 w-4 text-tfa-gray-400" />
                  : <ChevronRight className="h-4 w-4 text-tfa-gray-400" />}
              </button>

              {expanded && (
                <div className="divide-y divide-tfa-gray-100">
                  {section.questions?.map((q, idx) => {
                    const textEn = getTranslation(q.translations, 'en')?.text ?? ''
                    const textAr = getTranslation(q.translations, 'ar')?.text ?? ''
                    const isEditing = editingId === q.id

                    return (
                      <div key={q.id} className="px-5 py-4">
                        {!isEditing ? (
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs font-mono text-tfa-gray-400">#{idx + 1}</span>
                                <Badge variant="default">{TYPE_LABELS[q.question_type] ?? q.question_type}</Badge>
                                {q.visibility_rules.map((r) => (
                                  <Badge key={r.id} variant="info">{r.role.toUpperCase()}</Badge>
                                ))}
                              </div>
                              <p className="text-sm text-tfa-gray-900 leading-relaxed">{textEn}</p>
                              {textAr && (
                                <p className="text-sm text-tfa-gray-400 mt-1 leading-relaxed" dir="rtl">{textAr}</p>
                              )}
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => startEdit(q)}>
                              Edit
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide mb-1 block">
                                English Text
                              </label>
                              <textarea
                                className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy resize-none"
                                rows={3}
                                value={editForm.text_en}
                                onChange={(e) => setEditForm((f) => ({ ...f, text_en: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide mb-1 block">
                                Arabic Text
                              </label>
                              <textarea
                                className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy resize-none"
                                rows={3}
                                dir="rtl"
                                value={editForm.text_ar}
                                onChange={(e) => setEditForm((f) => ({ ...f, text_ar: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide mb-2 block">
                                Visible to Roles
                              </label>
                              <div className="flex gap-5">
                                {ROLES.map(({ key, label }) => (
                                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={editForm.roles.includes(key)}
                                      onChange={() => toggleRole(key)}
                                      className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy"
                                    />
                                    <span className="text-sm text-tfa-gray-700 font-medium">{label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveEdit(q)}
                                loading={updateMutation.isPending}
                              >
                                <Save className="h-3.5 w-3.5" /> Save
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                                <X className="h-3.5 w-3.5" /> Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
