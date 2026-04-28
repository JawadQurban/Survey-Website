import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Badge, statusBadgeVariant } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { adminApi } from '@/lib/api'
import { getTranslation } from '@/lib/i18n'
import type { PaginatedResponse, SubmissionSummary } from '@/types/admin'
import type { SubmissionOut, Survey } from '@/types/survey'
import { Download, Eye, X } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = { ceo: 'CEO', chro: 'CHRO', ld: 'L&D' }

function SubmissionPanel({
  submission,
  onClose,
}: {
  submission: SubmissionSummary
  onClose: () => void
}) {
  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ['submission-detail', submission.id],
    queryFn: () => adminApi.getSubmission(submission.id),
  })

  const { data: surveyData, isLoading: surveyLoading } = useQuery({
    queryKey: ['admin-survey', submission.survey_id],
    queryFn: () => adminApi.getSurvey(submission.survey_id),
  })

  const detail = detailData?.data as SubmissionOut
  const survey = surveyData?.data as Survey

  const questionMap = new Map<number, { text: string; options: Map<string, string> }>()
  if (survey?.sections) {
    for (const section of survey.sections) {
      for (const q of section.questions ?? []) {
        const text = getTranslation(q.translations, 'en')?.text ?? q.question_key
        const options = new Map<string, string>()
        for (const opt of q.options ?? []) {
          const optText = getTranslation(opt.translations, 'en')?.text ?? opt.option_key
          options.set(opt.option_key, optText)
        }
        questionMap.set(q.id, { text, options })
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-tfa-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-tfa-navy">Submission #{submission.id}</h2>
            <p className="text-sm text-tfa-gray-500">
              {submission.organization_name} · {ROLE_LABELS[submission.respondent_role] ?? submission.respondent_role} · {submission.respondent_email}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-tfa-gray-100 text-tfa-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 px-6 py-4">
          {(detailLoading || surveyLoading) && <PageSpinner />}
          {detail && !detailLoading && !surveyLoading && (
            <div className="space-y-4">
              {detail.answers.length === 0 && (
                <p className="text-tfa-gray-400 text-sm text-center py-8">No answers recorded.</p>
              )}
              {detail.answers.map((answer, idx) => {
                const qInfo = questionMap.get(answer.question_id)
                const qText = qInfo?.text ?? `Question ${answer.question_id}`

                let answerDisplay: string | null = null
                if (answer.selected_option_keys?.length) {
                  answerDisplay = answer.selected_option_keys
                    .map((k) => qInfo?.options.get(k) ?? k)
                    .join(', ')
                } else if (answer.open_text_value) {
                  answerDisplay = answer.open_text_value
                } else if (answer.numeric_value != null) {
                  answerDisplay = String(answer.numeric_value)
                }

                return (
                  <div key={answer.id} className="border border-tfa-gray-200 rounded-lg p-4">
                    <p className="text-xs text-tfa-gray-400 mb-1">Q{idx + 1}</p>
                    <p className="text-sm font-medium text-tfa-gray-900 mb-2">{qText}</p>
                    {answerDisplay ? (
                      <p className="text-sm text-tfa-navy bg-tfa-gray-50 rounded px-3 py-2">{answerDisplay}</p>
                    ) : (
                      <p className="text-xs text-tfa-gray-300 italic">No answer</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function Submissions() {
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<SubmissionSummary | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-submissions', roleFilter, statusFilter],
    queryFn: () =>
      adminApi.listSubmissions({
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
        limit: 100,
      }),
  })

  const handleExport = async (format: 'csv' | 'xlsx') => {
    const fn = format === 'csv' ? adminApi.exportCsv : adminApi.exportXlsx
    const res = await fn()
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = `submissions.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <PageSpinner />

  const result = data?.data as PaginatedResponse<SubmissionSummary>
  const submissions = result?.items ?? []

  return (
    <div className="space-y-6">
      {selected && <SubmissionPanel submission={selected} onClose={() => setSelected(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-tfa-navy">Submissions</h1>
          <p className="text-sm text-tfa-gray-500 mt-1">{result?.total ?? 0} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('xlsx')}>
            <Download className="h-4 w-4" /> XLSX
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select
          className="rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="ceo">CEO</option>
          <option value="chro">CHRO</option>
          <option value="ld">L&D Leader</option>
        </select>
        <select
          className="rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tfa-gray-200">
              {['ID', 'Organization', 'Role', 'Email', 'Status', 'Submitted At', 'Actions'].map((h) => (
                <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} className="border-b border-tfa-gray-100 hover:bg-tfa-gray-50">
                <td className="py-3 px-3 text-tfa-gray-400 font-mono text-xs">#{s.id}</td>
                <td className="py-3 px-3 font-medium text-tfa-gray-900">{s.organization_name}</td>
                <td className="py-3 px-3">
                  <Badge variant="info">{ROLE_LABELS[s.respondent_role] ?? s.respondent_role}</Badge>
                </td>
                <td className="py-3 px-3 text-tfa-gray-600">{s.respondent_email}</td>
                <td className="py-3 px-3">
                  <Badge variant={statusBadgeVariant(s.status)}>{s.status}</Badge>
                </td>
                <td className="py-3 px-3 text-tfa-gray-500 text-xs">
                  {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}
                </td>
                <td className="py-3 px-3">
                  <Button variant="ghost" size="sm" onClick={() => setSelected(s)}>
                    <Eye className="h-3.5 w-3.5" /> View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {submissions.length === 0 && (
          <div className="text-center py-12 text-tfa-gray-400">No submissions match your filters.</div>
        )}
      </div>
    </div>
  )
}
