import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { getTranslation } from '@/lib/i18n'
import { PageSpinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Survey, Question, QuestionType } from '@/types/survey'
import { ArrowLeft, Save, X, Plus, Trash2, Pencil, CheckCircle2, ChevronUp, ChevronDown } from 'lucide-react'

const ROLES = [
  { key: 'ceo',  label: 'CEO'  },
  { key: 'chro', label: 'CHRO' },
  { key: 'ld',   label: 'L&D'  },
] as const

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'single_choice',   label: 'Single Choice'  },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'open_text',       label: 'Open Text'       },
  { value: 'textarea',        label: 'Text Area'       },
]

const TYPE_LABELS: Record<string, string> = {
  single_choice:   'Single',
  multiple_choice: 'Multi',
  open_text:       'Open Text',
  textarea:        'Text Area',
}

const isChoice = (type: QuestionType) =>
  type === 'single_choice' || type === 'multiple_choice'

interface OptionDraft {
  uid: string
  text_en: string
  text_ar: string
}

interface EditForm {
  text_en:              string
  text_ar:              string
  question_type:        QuestionType
  roles:                string[]
  has_open_text_option: boolean
  open_text_label_en:   string
  open_text_label_ar:   string
  newOptEn:             string
  newOptAr:             string
}

interface NewQForm {
  key:                  string
  type:                 QuestionType
  text_en:              string
  text_ar:              string
  roles:                string[]
  options:              OptionDraft[]
  has_open_text_option: boolean
  open_text_label_en:   string
  open_text_label_ar:   string
  newOptEn:             string
  newOptAr:             string
}

const EMPTY_NEW_Q: NewQForm = {
  key:                  '',
  type:                 'open_text',
  text_en:              '',
  text_ar:              '',
  roles:                ['ceo', 'chro', 'ld'],
  options:              [],
  has_open_text_option: false,
  open_text_label_en:   '',
  open_text_label_ar:   '',
  newOptEn:             '',
  newOptAr:             '',
}

export function QuestionBuilder() {
  const { surveyId } = useParams<{ surveyId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [editingId,      setEditingId]      = useState<number | null>(null)
  const [editForm,       setEditForm]       = useState<EditForm>({ text_en: '', text_ar: '', question_type: 'open_text', roles: [], has_open_text_option: false, open_text_label_en: '', open_text_label_ar: '', newOptEn: '', newOptAr: '' })
  const [editError,      setEditError]      = useState<string>('')
  const [savedId,        setSavedId]        = useState<number | null>(null)
  const [editingOptId,   setEditingOptId]   = useState<number | null>(null)
  const [editOptEn,      setEditOptEn]      = useState('')
  const [editOptAr,      setEditOptAr]      = useState('')
  const [showAddForm,    setShowAddForm]    = useState(false)
  const [newQForm,       setNewQForm]       = useState<NewQForm>(EMPTY_NEW_Q)
  const [roleFilter,     setRoleFilter]     = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-survey', surveyId],
    queryFn: () => adminApi.getSurvey(Number(surveyId)),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-survey', surveyId] })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: object }) =>
      adminApi.updateQuestion(id, payload),
    onSuccess: (_data, vars) => { invalidate(); setEditingId(null); setEditError(''); setSavedId((vars as {id:number}).id); setTimeout(() => setSavedId(null), 2500) },
    onError: (err: { response?: { status?: number; data?: { detail?: string | { msg: string; loc?: unknown[] }[] } } }) => {
      console.error('[QuestionBuilder] save error:', err)
      const status  = err.response?.status
      const detail  = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setEditError(detail.map((d) => `${d.loc?.slice(-1)[0] ?? ''}: ${d.msg}`.replace(/^: /, '')).join(' | '))
      } else if (typeof detail === 'string') {
        setEditError(`[${status}] ${detail}`)
      } else {
        setEditError(`[${status ?? 'network'}] Save failed — open browser DevTools console for details.`)
      }
    },
  })

  const deleteQuestionMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteQuestion(id),
    onSuccess: invalidate,
  })

  const createQuestionMutation = useMutation({
    mutationFn: (payload: object) => adminApi.createQuestion(payload),
  })

  const createOptionMutation = useMutation({
    mutationFn: (payload: object) => adminApi.createOption(payload),
  })

  const deleteOptionMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteOption(id),
    onSuccess: invalidate,
  })

  const updateOptionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: object }) =>
      adminApi.updateOption(id, payload),
    onSuccess: () => { invalidate(); setEditingOptId(null) },
  })

  const reorderMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: object }) =>
      adminApi.updateQuestion(id, payload),
    onSuccess: () => invalidate(),
  })

  const moveQuestion = (q: Question, direction: 'up' | 'down') => {
    const list = allQuestions // sorted by display_order from the API
    const idx  = list.findIndex((x) => x.id === q.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= list.length) return
    const other = list[swapIdx]
    // Swap display_orders between the two questions
    reorderMutation.mutate({ id: q.id, payload: {
      section_id: q.section_id, question_key: q.question_key,
      question_type: q.question_type, display_order: other.display_order,
      is_required: q.is_required, has_open_text_option: q.has_open_text_option,
      open_text_label_en: q.open_text_label_en, open_text_label_ar: q.open_text_label_ar,
      module: q.module, visible_to_roles: q.visibility_rules.map((r) => r.role),
      translations: q.translations.map((t) => ({ language_code: t.language_code, text: t.text })),
    }})
    reorderMutation.mutate({ id: other.id, payload: {
      section_id: other.section_id, question_key: other.question_key,
      question_type: other.question_type, display_order: q.display_order,
      is_required: other.is_required, has_open_text_option: other.has_open_text_option,
      open_text_label_en: other.open_text_label_en, open_text_label_ar: other.open_text_label_ar,
      module: other.module, visible_to_roles: other.visibility_rules.map((r) => r.role),
      translations: other.translations.map((t) => ({ language_code: t.language_code, text: t.text })),
    }})
  }

  const createSectionMutation = useMutation({
    mutationFn: (payload: object) => adminApi.createSection(payload),
  })

  if (isLoading) return <PageSpinner />
  const survey = data?.data as Survey
  if (!survey) return null

  const titleEn      = getTranslation(survey.translations, 'en')?.title ?? survey.slug
  const allQuestions = (survey.sections ?? []).flatMap((s) => s.questions)
  const visibleQuestions = roleFilter === 'all'
    ? allQuestions
    : allQuestions.filter((q) => q.visibility_rules.some((r) => r.role === roleFilter))

  const startEdit = (q: Question) => {
    setEditingId(q.id)
    setEditForm({
      text_en:              getTranslation(q.translations, 'en')?.text ?? '',
      text_ar:              getTranslation(q.translations, 'ar')?.text ?? '',
      question_type:        q.question_type,
      roles:                q.visibility_rules.map((r) => r.role),
      has_open_text_option: q.has_open_text_option,
      open_text_label_en:   q.open_text_label_en ?? '',
      open_text_label_ar:   q.open_text_label_ar ?? '',
      newOptEn:             '',
      newOptAr:             '',
    })
  }

  const toggleEditRole = (role: string) =>
    setEditForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }))

  const toggleNewQRole = (role: string) =>
    setNewQForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }))

  const saveEdit = (q: Question) => {
    const textEn = editForm.text_en.trim()
    if (!textEn) { setEditError('English question text is required.'); return }
    setEditError('')
    updateMutation.mutate({
      id: q.id,
      payload: {
        section_id:            q.section_id,
        question_key:          q.question_key,
        question_type:         editForm.question_type,
        display_order:         q.display_order,
        is_required:           q.is_required,
        has_open_text_option:  editForm.has_open_text_option,
        open_text_label_en:    editForm.open_text_label_en || null,
        open_text_label_ar:    editForm.open_text_label_ar || null,
        module:                q.module,
        visible_to_roles:      editForm.roles,
        translations: [
          { language_code: 'en', text: textEn },
          ...(editForm.text_ar.trim() ? [{ language_code: 'ar', text: editForm.text_ar.trim() }] : []),
        ],
      },
    })
  }

  const handleAddNewOption = () => {
    if (!newQForm.newOptEn.trim()) return
    setNewQForm((f) => ({
      ...f,
      options:  [...f.options, { uid: String(Date.now()), text_en: f.newOptEn.trim(), text_ar: f.newOptAr.trim() }],
      newOptEn: '',
      newOptAr: '',
    }))
  }

  const handleAddExistingOption = async (questionId: number) => {
    if (!editForm.newOptEn.trim()) return
    await createOptionMutation.mutateAsync({
      question_id:   questionId,
      option_key:    `opt_${Date.now()}`,
      display_order: 0,
      translations: [
        { language_code: 'en', text: editForm.newOptEn.trim() },
        ...(editForm.newOptAr.trim() ? [{ language_code: 'ar', text: editForm.newOptAr.trim() }] : []),
      ],
    })
    invalidate()
    setEditForm((f) => ({ ...f, newOptEn: '', newOptAr: '' }))
  }

  const handleCreateQuestion = async () => {
    if (!newQForm.text_en.trim()) return

    let sectionId: number
    if (survey.sections && survey.sections.length > 0) {
      sectionId = survey.sections[0].id
    } else {
      const res = await createSectionMutation.mutateAsync({
        survey_id:     survey.id,
        section_key:   'default',
        display_order: 0,
        translations:  [{ language_code: 'en', title: 'Default' }],
      })
      sectionId = (res as { data: { id: number } }).data.id
    }

    const key      = newQForm.key.trim() || `q_${Date.now()}`
    const maxOrder = allQuestions.reduce((m, q) => Math.max(m, q.display_order), -1)

    const qRes = await createQuestionMutation.mutateAsync({
      section_id:           sectionId,
      question_key:         key,
      question_type:        newQForm.type,
      display_order:        maxOrder + 1,
      is_required:          true,
      has_open_text_option: newQForm.has_open_text_option,
      open_text_label_en:   newQForm.open_text_label_en || null,
      open_text_label_ar:   newQForm.open_text_label_ar || null,
      visible_to_roles:     newQForm.roles,
      translations: [
        { language_code: 'en', text: newQForm.text_en.trim() },
        ...(newQForm.text_ar.trim() ? [{ language_code: 'ar', text: newQForm.text_ar.trim() }] : []),
      ],
    })

    const newQuestionId = (qRes as { data: { id: number } }).data.id

    if (isChoice(newQForm.type)) {
      for (let i = 0; i < newQForm.options.length; i++) {
        const opt = newQForm.options[i]
        await createOptionMutation.mutateAsync({
          question_id:   newQuestionId,
          option_key:    `${key}_opt_${i}`,
          display_order: i,
          translations: [
            { language_code: 'en', text: opt.text_en },
            ...(opt.text_ar ? [{ language_code: 'ar', text: opt.text_ar }] : []),
          ],
        })
      }
    }

    invalidate()
    setShowAddForm(false)
    setNewQForm(EMPTY_NEW_Q)
  }

  const isSaving =
    createQuestionMutation.isPending ||
    createOptionMutation.isPending   ||
    createSectionMutation.isPending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/surveys')}
            className="p-1.5 rounded-lg hover:bg-tfa-gray-100 text-tfa-gray-400 hover:text-tfa-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-tfa-gray-800">Question Editor</h1>
            <p className="text-sm text-tfa-gray-500">
              {titleEn} · {visibleQuestions.length} of {allQuestions.length} question{allQuestions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button
          onClick={() => { setShowAddForm(true); setEditingId(null) }}
          disabled={showAddForm}
        >
          <Plus className="h-4 w-4" /> Add Question
        </Button>
      </div>

      {/* Role filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-tfa-gray-500 uppercase tracking-wide">Filter by role:</span>
        {(['all', 'ceo', 'chro', 'ld'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              roleFilter === r
                ? 'bg-tfa-navy text-white'
                : 'bg-tfa-gray-100 text-tfa-gray-600 hover:bg-tfa-gray-200'
            }`}
          >
            {r === 'all' ? 'All' : r === 'ceo' ? 'CEO' : r === 'chro' ? 'CHRO' : 'L&D'}
          </button>
        ))}
        {roleFilter !== 'all' && (
          <span className="text-xs text-tfa-gray-400 ml-1">
            {visibleQuestions.length} question{visibleQuestions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Flat question list */}
      <div className="border border-tfa-gray-200 rounded overflow-hidden divide-y divide-tfa-gray-100 bg-white">
        {visibleQuestions.length === 0 && !showAddForm && (
          <div className="px-6 py-12 text-center text-tfa-gray-400 text-sm">
            {allQuestions.length === 0
              ? 'No questions yet. Click "Add Question" to get started.'
              : `No questions visible to ${roleFilter.toUpperCase()} role.`}
          </div>
        )}

        {visibleQuestions.map((q, idx) => {
          const textEn    = getTranslation(q.translations, 'en')?.text ?? ''
          const textAr    = getTranslation(q.translations, 'ar')?.text ?? ''
          const isEditing    = editingId === q.id
          const choiceQ      = isEditing ? isChoice(editForm.question_type) : isChoice(q.question_type)

          return (
            <div key={q.id} className="px-5 py-4">
              {!isEditing ? (
                /* — View mode — */
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
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
                    {choiceQ && q.options.filter((o) => o.is_active).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {q.options.filter((o) => o.is_active).map((o) => (
                          <span
                            key={o.id}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-tfa-gray-100 text-xs text-tfa-gray-600"
                          >
                            {getTranslation(o.translations, 'en')?.text ?? o.option_key}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {savedId === q.id && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium pr-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Saved
                      </span>
                    )}
                    {/* Reorder buttons */}
                    <button
                      onClick={() => moveQuestion(q, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-tfa-gray-100 text-tfa-gray-400 hover:text-tfa-gray-700 disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveQuestion(q, 'down')}
                      disabled={idx === visibleQuestions.length - 1}
                      className="p-1 rounded hover:bg-tfa-gray-100 text-tfa-gray-400 hover:text-tfa-gray-700 disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(q)}>Edit</Button>
                    <button
                      onClick={() => {
                        if (!window.confirm(`Delete question: "${textEn.slice(0, 80)}"?`)) return
                        deleteQuestionMutation.mutate(q.id)
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-tfa-gray-300 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* — Edit mode — */
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide mb-1 block">
                      Question Type
                    </label>
                    <select
                      className="w-56 rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                      value={editForm.question_type}
                      onChange={(e) => setEditForm((f) => ({ ...f, question_type: e.target.value as QuestionType }))}
                    >
                      {QUESTION_TYPES.map((qt) => (
                        <option key={qt.value} value={qt.value}>{qt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                            onChange={() => toggleEditRole(key)}
                            className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy"
                          />
                          <span className="text-sm text-tfa-gray-700 font-medium">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Option editor — choice types only */}
                  {choiceQ && (
                    <div className="border border-tfa-gray-200 rounded-lg p-4 space-y-3">
                      <p className="text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide">Answer Options</p>
                      {q.options.filter((o) => o.is_active).map((o) => {
                        const optEn = getTranslation(o.translations, 'en')?.text ?? o.option_key
                        const optAr = getTranslation(o.translations, 'ar')?.text ?? ''
                        const isEditingOpt = editingOptId === o.id
                        return (
                          <div key={o.id}>
                            {isEditingOpt ? (
                              <div className="space-y-2 bg-tfa-gray-50 p-3 rounded border border-tfa-navy/20">
                                <div className="flex gap-2">
                                  <input
                                    className="flex-1 rounded border border-tfa-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                                    placeholder="English"
                                    value={editOptEn}
                                    onChange={(e) => setEditOptEn(e.target.value)}
                                  />
                                  <input
                                    className="flex-1 rounded border border-tfa-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                                    placeholder="Arabic (optional)"
                                    dir="rtl"
                                    value={editOptAr}
                                    onChange={(e) => setEditOptAr(e.target.value)}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    loading={updateOptionMutation.isPending}
                                    onClick={() => {
                                      if (!editOptEn.trim()) return
                                      updateOptionMutation.mutate({
                                        id: o.id,
                                        payload: {
                                          question_id:   o.question_id,
                                          option_key:    o.option_key,
                                          display_order: o.display_order,
                                          translations: [
                                            { language_code: 'en', text: editOptEn.trim() },
                                            ...(editOptAr.trim() ? [{ language_code: 'ar', text: editOptAr.trim() }] : []),
                                          ],
                                        },
                                      })
                                    }}
                                  >
                                    <Save className="h-3 w-3" /> Save
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setEditingOptId(null)}>
                                    <X className="h-3 w-3" /> Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 bg-tfa-gray-50 px-3 py-2 rounded">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-tfa-gray-900">{optEn}</p>
                                  {optAr && <p className="text-xs text-tfa-gray-400" dir="rtl">{optAr}</p>}
                                </div>
                                <button
                                  onClick={() => { setEditingOptId(o.id); setEditOptEn(optEn); setEditOptAr(optAr) }}
                                  className="p-1 rounded hover:bg-tfa-gray-200 text-tfa-gray-400 hover:text-tfa-gray-700 shrink-0"
                                  title="Edit option"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (!window.confirm(`Delete option "${optEn}"?`)) return
                                    deleteOptionMutation.mutate(o.id)
                                  }}
                                  className="p-1 rounded hover:bg-red-50 text-tfa-gray-300 hover:text-red-500 shrink-0"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <div className="flex gap-2">
                        <input
                          className="flex-1 rounded-lg border border-tfa-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                          placeholder="English option text"
                          value={editForm.newOptEn}
                          onChange={(e) => setEditForm((f) => ({ ...f, newOptEn: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddExistingOption(q.id) } }}
                        />
                        <input
                          className="flex-1 rounded-lg border border-tfa-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                          placeholder="نص الخيار بالعربية"
                          dir="rtl"
                          value={editForm.newOptAr}
                          onChange={(e) => setEditForm((f) => ({ ...f, newOptAr: e.target.value }))}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAddExistingOption(q.id)}
                          loading={createOptionMutation.isPending}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add
                        </Button>
                      </div>

                      {/* "Other / open text" option toggle */}
                      <div className="pt-2 border-t border-tfa-gray-100 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={editForm.has_open_text_option}
                            onChange={(e) => setEditForm((f) => ({ ...f, has_open_text_option: e.target.checked }))}
                            className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy"
                          />
                          <span className="text-sm text-tfa-gray-700 font-medium">Add "Other (please specify)" option</span>
                        </label>
                        {editForm.has_open_text_option && (
                          <div className="flex gap-2 pl-6">
                            <input
                              className="flex-1 rounded-lg border border-tfa-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                              placeholder='Label in English (e.g. "Other")'
                              value={editForm.open_text_label_en}
                              onChange={(e) => setEditForm((f) => ({ ...f, open_text_label_en: e.target.value }))}
                            />
                            <input
                              className="flex-1 rounded-lg border border-tfa-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                              placeholder='التسمية بالعربية (مثل "أخرى")'
                              dir="rtl"
                              value={editForm.open_text_label_ar}
                              onChange={(e) => setEditForm((f) => ({ ...f, open_text_label_ar: e.target.value }))}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {editError && (
                    <p className="text-xs text-red-500 font-medium">{editError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(q)} loading={updateMutation.isPending}>
                      <Save className="h-3.5 w-3.5" /> Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setEditError('') }}>
                      <X className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Question form */}
      {showAddForm && (
        <div className="border border-tfa-navy/20 rounded-lg px-5 py-5 bg-tfa-gray-50 space-y-4">
          <p className="text-xs font-semibold text-tfa-navy uppercase tracking-wide">New Question</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-tfa-gray-500 mb-1 block">Type</label>
              <select
                className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                value={newQForm.type}
                onChange={(e) =>
                  setNewQForm((f) => ({ ...f, type: e.target.value as QuestionType, options: [] }))
                }
              >
                {QUESTION_TYPES.map((qt) => (
                  <option key={qt.value} value={qt.value}>{qt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-tfa-gray-500 mb-1 block">Key (optional)</label>
              <input
                className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy font-mono"
                placeholder="auto-generated"
                value={newQForm.key}
                onChange={(e) => setNewQForm((f) => ({ ...f, key: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-tfa-gray-500 mb-1 block">
                English Text <span className="text-red-400">*</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy resize-none"
                rows={3}
                placeholder="Question text in English"
                value={newQForm.text_en}
                onChange={(e) => setNewQForm((f) => ({ ...f, text_en: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-tfa-gray-500 mb-1 block">Arabic Text</label>
              <textarea
                className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy resize-none"
                rows={3}
                dir="rtl"
                placeholder="نص السؤال بالعربية"
                value={newQForm.text_ar}
                onChange={(e) => setNewQForm((f) => ({ ...f, text_ar: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-tfa-gray-500 mb-2 block">Visible to Roles</label>
            <div className="flex gap-5">
              {ROLES.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newQForm.roles.includes(key)}
                    onChange={() => toggleNewQRole(key)}
                    className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy"
                  />
                  <span className="text-sm text-tfa-gray-700 font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Inline option editor — only for choice types */}
          {isChoice(newQForm.type) && (
            <div className="border border-tfa-gray-200 rounded-lg p-4 space-y-3 bg-white">
              <p className="text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide">Answer Options</p>
              {newQForm.options.map((opt) => (
                <div key={opt.uid} className="flex items-center gap-2 bg-tfa-gray-50 px-3 py-2 rounded border border-tfa-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-tfa-gray-900">{opt.text_en}</p>
                    {opt.text_ar && <p className="text-xs text-tfa-gray-400" dir="rtl">{opt.text_ar}</p>}
                  </div>
                  <button
                    onClick={() => setNewQForm((f) => ({ ...f, options: f.options.filter((o) => o.uid !== opt.uid) }))}
                    className="p-1 rounded hover:bg-red-50 text-tfa-gray-300 hover:text-red-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-tfa-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                  placeholder="English option text"
                  value={newQForm.newOptEn}
                  onChange={(e) => setNewQForm((f) => ({ ...f, newOptEn: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNewOption() } }}
                />
                <input
                  className="flex-1 rounded-lg border border-tfa-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                  placeholder="نص الخيار بالعربية"
                  dir="rtl"
                  value={newQForm.newOptAr}
                  onChange={(e) => setNewQForm((f) => ({ ...f, newOptAr: e.target.value }))}
                />
                <Button size="sm" variant="secondary" onClick={handleAddNewOption}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>

              {/* "Other / open text" option toggle */}
              <div className="pt-2 border-t border-tfa-gray-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newQForm.has_open_text_option}
                    onChange={(e) => setNewQForm((f) => ({ ...f, has_open_text_option: e.target.checked }))}
                    className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy"
                  />
                  <span className="text-sm text-tfa-gray-700 font-medium">Add "Other (please specify)" option</span>
                </label>
                {newQForm.has_open_text_option && (
                  <div className="flex gap-2 pl-6">
                    <input
                      className="flex-1 rounded-lg border border-tfa-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                      placeholder='Label in English (e.g. "Other")'
                      value={newQForm.open_text_label_en}
                      onChange={(e) => setNewQForm((f) => ({ ...f, open_text_label_en: e.target.value }))}
                    />
                    <input
                      className="flex-1 rounded-lg border border-tfa-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                      placeholder='التسمية بالعربية (مثل "أخرى")'
                      dir="rtl"
                      value={newQForm.open_text_label_ar}
                      onChange={(e) => setNewQForm((f) => ({ ...f, open_text_label_ar: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleCreateQuestion}
              loading={isSaving}
              disabled={!newQForm.text_en.trim() || isSaving}
            >
              <Plus className="h-3.5 w-3.5" /> Create Question
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowAddForm(false); setNewQForm(EMPTY_NEW_Q) }}
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
