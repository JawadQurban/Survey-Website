import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/lib/api'
import { getTranslation } from '@/lib/i18n'
import { PageSpinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Survey, Question, QuestionType } from '@/types/survey'
import { ArrowLeft, ChevronDown, ChevronRight, Save, X, Plus, Trash2 } from 'lucide-react'

const ROLES = [
  { key: 'ceo', label: 'CEO' },
  { key: 'chro', label: 'CHRO' },
  { key: 'ld', label: 'L&D' },
] as const

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'open_text', label: 'Open Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'number', label: 'Number' },
  { value: 'rating', label: 'Rating' },
]

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

interface NewQuestionForm {
  key: string
  type: QuestionType
  text_en: string
  text_ar: string
  roles: string[]
}

interface NewSectionForm {
  key: string
  title_en: string
  title_ar: string
}

const EMPTY_Q_FORM: NewQuestionForm = {
  key: '',
  type: 'open_text',
  text_en: '',
  text_ar: '',
  roles: ['ceo', 'chro', 'ld'],
}

const EMPTY_S_FORM: NewSectionForm = { key: '', title_en: '', title_ar: '' }

export function QuestionBuilder() {
  const { surveyId } = useParams<{ surveyId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())
  const [editForm, setEditForm] = useState<EditForm>({ text_en: '', text_ar: '', roles: [] })

  const [addingToSection, setAddingToSection] = useState<number | null>(null)
  const [newQForm, setNewQForm] = useState<NewQuestionForm>(EMPTY_Q_FORM)

  const [addingSection, setAddingSection] = useState(false)
  const [newSectionForm, setNewSectionForm] = useState<NewSectionForm>(EMPTY_S_FORM)

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

  const deleteQuestionMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteQuestion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-survey', surveyId] }),
  })

  const createQuestionMutation = useMutation({
    mutationFn: (payload: object) => adminApi.createQuestion(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-survey', surveyId] })
      setAddingToSection(null)
      setNewQForm(EMPTY_Q_FORM)
    },
  })

  const deleteSectionMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteSection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-survey', surveyId] }),
  })

  const createSectionMutation = useMutation({
    mutationFn: (payload: object) => adminApi.createSection(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-survey', surveyId] })
      setAddingSection(false)
      setNewSectionForm(EMPTY_S_FORM)
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

  const toggleRole = (role: string) =>
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

  const handleDeleteQuestion = (q: Question) => {
    const text = getTranslation(q.translations, 'en')?.text ?? q.question_key
    if (!window.confirm(`Delete question: "${text.slice(0, 80)}"?`)) return
    deleteQuestionMutation.mutate(q.id)
  }

  const handleAddQuestion = (sectionId: number, sectionQuestions: Question[]) => {
    if (!newQForm.text_en.trim()) return
    const key = newQForm.key.trim() || `q_${Date.now()}`
    const maxOrder = sectionQuestions.reduce((m, q) => Math.max(m, q.display_order), -1)
    createQuestionMutation.mutate({
      section_id: sectionId,
      question_key: key,
      question_type: newQForm.type,
      display_order: maxOrder + 1,
      is_required: true,
      has_open_text_option: false,
      visible_to_roles: newQForm.roles,
      translations: [
        { language_code: 'en', text: newQForm.text_en.trim() },
        ...(newQForm.text_ar.trim() ? [{ language_code: 'ar', text: newQForm.text_ar.trim() }] : []),
      ],
    })
  }

  const handleDeleteSection = (sectionId: number, sectionTitle: string, questionCount: number) => {
    const warning = questionCount > 0 ? ` It contains ${questionCount} question(s) which will also be deleted.` : ''
    if (!window.confirm(`Delete section "${sectionTitle}"?${warning}`)) return
    deleteSectionMutation.mutate(sectionId)
  }

  const handleAddSection = () => {
    if (!newSectionForm.title_en.trim()) return
    const key = newSectionForm.key.trim() || `section_${Date.now()}`
    const maxOrder = survey.sections?.reduce((m, s) => Math.max(m, s.display_order), -1) ?? -1
    createSectionMutation.mutate({
      survey_id: survey.id,
      section_key: key,
      display_order: maxOrder + 1,
      translations: [
        { language_code: 'en', title: newSectionForm.title_en.trim() },
        ...(newSectionForm.title_ar.trim() ? [{ language_code: 'ar', title: newSectionForm.title_ar.trim() }] : []),
      ],
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
          <h1 className="text-2xl font-bold text-tfa-gray-800">Question Editor</h1>
          <p className="text-sm text-tfa-gray-500">
            {titleEn} · {survey.sections?.length ?? 0} sections · {totalQuestions} questions
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {survey.sections?.map((section) => {
          const sTitle = getTranslation(section.translations, 'en')?.title ?? section.section_key
          const expanded = expandedSections.has(section.id)
          const isAddingHere = addingToSection === section.id

          return (
            <div key={section.id} className="border border-tfa-gray-200 rounded overflow-hidden">
              {/* Section header */}
              <div className="w-full flex items-center justify-between px-5 py-4 bg-tfa-gray-50">
                <button
                  className="flex-1 flex items-center gap-3 text-left"
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
                <div className="flex gap-1 ml-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAddingToSection(isAddingHere ? null : section.id)
                      setNewQForm(EMPTY_Q_FORM)
                      if (!expanded) toggleSection(section.id)
                    }}
                    className="text-tfa-navy"
                  >
                    <Plus className="h-3.5 w-3.5" /> Question
                  </Button>
                  <button
                    onClick={() => handleDeleteSection(section.id, sTitle, section.questions?.length ?? 0)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-tfa-gray-300 hover:text-red-500"
                    title="Delete section"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Questions list */}
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
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => startEdit(q)}>
                                Edit
                              </Button>
                              <button
                                onClick={() => handleDeleteQuestion(q)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-tfa-gray-300 hover:text-red-500"
                                title="Delete question"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
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
                              <Button size="sm" onClick={() => saveEdit(q)} loading={updateMutation.isPending}>
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

                  {/* Add question inline form */}
                  {isAddingHere && (
                    <div className="px-5 py-4 bg-tfa-gray-50 border-t border-tfa-navy/10">
                      <p className="text-xs font-semibold text-tfa-navy uppercase tracking-wide mb-3">Add Question</p>
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <label className="text-xs text-tfa-gray-500 mb-1 block">Type</label>
                            <select
                              className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                              value={newQForm.type}
                              onChange={(e) => setNewQForm((f) => ({ ...f, type: e.target.value as QuestionType }))}
                            >
                              {QUESTION_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-tfa-gray-500 mb-1 block">Key (optional)</label>
                            <input
                              className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy font-mono"
                              placeholder="auto-generated"
                              value={newQForm.key}
                              onChange={(e) => setNewQForm((f) => ({ ...f, key: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-tfa-gray-500 mb-1 block">English Text <span className="text-red-400">*</span></label>
                          <textarea
                            className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy resize-none"
                            rows={2}
                            placeholder="Question text in English"
                            value={newQForm.text_en}
                            onChange={(e) => setNewQForm((f) => ({ ...f, text_en: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-tfa-gray-500 mb-1 block">Arabic Text</label>
                          <textarea
                            className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy resize-none"
                            rows={2}
                            dir="rtl"
                            placeholder="نص السؤال بالعربية"
                            value={newQForm.text_ar}
                            onChange={(e) => setNewQForm((f) => ({ ...f, text_ar: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-tfa-gray-500 mb-1 block">Visible to Roles</label>
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
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAddQuestion(section.id, section.questions ?? [])}
                            loading={createQuestionMutation.isPending}
                          >
                            <Plus className="h-3.5 w-3.5" /> Add
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setAddingToSection(null)}>
                            <X className="h-3.5 w-3.5" /> Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Add section */}
        {!addingSection ? (
          <button
            onClick={() => setAddingSection(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-tfa-gray-200 rounded text-sm text-tfa-gray-400 hover:border-tfa-navy hover:text-tfa-navy transition-colors"
          >
            <Plus className="h-4 w-4" /> Add Section
          </button>
        ) : (
          <div className="border border-tfa-navy/20 rounded px-5 py-4 bg-tfa-gray-50 space-y-3">
            <p className="text-xs font-semibold text-tfa-navy uppercase tracking-wide">New Section</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-tfa-gray-500 mb-1 block">English Title <span className="text-red-400">*</span></label>
                <input
                  className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                  placeholder="Section title"
                  value={newSectionForm.title_en}
                  onChange={(e) => setNewSectionForm((f) => ({ ...f, title_en: e.target.value }))}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-tfa-gray-500 mb-1 block">Arabic Title</label>
                <input
                  className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
                  dir="rtl"
                  placeholder="عنوان القسم"
                  value={newSectionForm.title_ar}
                  onChange={(e) => setNewSectionForm((f) => ({ ...f, title_ar: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-tfa-gray-500 mb-1 block">Key (optional)</label>
              <input
                className="w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy font-mono"
                placeholder="auto-generated"
                value={newSectionForm.key}
                onChange={(e) => setNewSectionForm((f) => ({ ...f, key: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddSection} loading={createSectionMutation.isPending}>
                <Plus className="h-3.5 w-3.5" /> Add Section
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setAddingSection(false)}>
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
