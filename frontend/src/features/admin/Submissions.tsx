import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Badge, statusBadgeVariant } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { adminApi } from '@/lib/api'
import type { PaginatedResponse, SubmissionSummary } from '@/types/admin'
import { Download, RotateCcw } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = { ceo: 'CEO', chro: 'CHRO', ld: 'L&D' }

export function Submissions() {
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-submissions', roleFilter, statusFilter],
    queryFn: () =>
      adminApi.listSubmissions({
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
        limit: 100,
      }),
  })

  const reopenMutation = useMutation({
    mutationFn: (id: number) => adminApi.reopenSubmission(id, 'Admin reopened'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-submissions'] }),
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-tfa-navy">Submissions</h1>
          <p className="text-sm text-tfa-gray-500 mt-1">{result?.total ?? 0} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4" />
            CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExport('xlsx')}>
            <Download className="h-4 w-4" />
            XLSX
          </Button>
        </div>
      </div>

      {/* Filters */}
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
          <option value="reopened">Reopened</option>
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
                  {s.status === 'submitted' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => reopenMutation.mutate(s.id)}
                      loading={reopenMutation.isPending}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reopen
                    </Button>
                  )}
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
