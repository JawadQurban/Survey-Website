import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { adminApi } from '@/lib/api'
import type { GroupRegistrationOut, GroupRegistrationSummary } from '@/types/groupRegistration'
import { Download, X, ChevronRight } from 'lucide-react'

// ── Detail modal ──────────────────────────────────────────────────────────────
function RegistrationDetailModal({
  reg, onClose,
}: { reg: GroupRegistrationOut; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded border border-tfa-gray-200 shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-tfa-gray-800">Registration Detail</h2>
            <p className="text-sm font-mono text-tfa-navy mt-0.5">{reg.reference_number}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-tfa-gray-100 text-tfa-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Organization */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-tfa-gray-50 rounded-lg border border-tfa-gray-200">
          <div>
            <p className="text-xs text-tfa-gray-400 uppercase tracking-wide mb-0.5">Organization</p>
            <p className="font-semibold text-tfa-gray-800">{reg.organization_name}</p>
            {reg.department && <p className="text-sm text-tfa-gray-500">{reg.department}</p>}
          </div>
          <div>
            <p className="text-xs text-tfa-gray-400 uppercase tracking-wide mb-0.5">Focal Point</p>
            <p className="font-semibold text-tfa-gray-800">{reg.focal_point_name}</p>
            {reg.focal_point_position && <p className="text-sm text-tfa-gray-500">{reg.focal_point_position}</p>}
          </div>
          <div>
            <p className="text-xs text-tfa-gray-400 uppercase tracking-wide mb-0.5">Email</p>
            <p className="text-sm text-tfa-gray-700">{reg.email}</p>
          </div>
          <div>
            <p className="text-xs text-tfa-gray-400 uppercase tracking-wide mb-0.5">Mobile</p>
            <p className="text-sm text-tfa-gray-700">{reg.mobile || '—'}</p>
          </div>
        </div>

        {/* Sectors */}
        {(reg.selected_sectors?.length ?? 0) > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-tfa-gray-400 uppercase tracking-wide mb-2">Sectors</p>
            <div className="flex flex-wrap gap-2">
              {reg.selected_sectors?.map((s) => (
                <Badge key={s} variant="info">{s}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Nominations table */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-tfa-gray-400 uppercase tracking-wide mb-2">
            Nominations ({reg.nominations?.length ?? 0})
          </p>
          <div className="overflow-x-auto rounded-lg border border-tfa-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-tfa-gray-50 border-b border-tfa-gray-200">
                <tr>
                  {['#', 'Sector', 'Functional Area', 'Code', 'Course', 'Mode', 'Quarters', 'Count'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-tfa-gray-100">
                {(reg.nominations ?? []).map((nom: any, i) => (
                  <tr key={i} className="hover:bg-tfa-gray-50">
                    <td className="px-3 py-2 text-tfa-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="px-3 py-2">{nom.sector}</td>
                    <td className="px-3 py-2">{nom.functional_area}</td>
                    <td className="px-3 py-2 font-mono text-xs text-tfa-navy">{nom.course_code}</td>
                    <td className="px-3 py-2">{nom.course_title}</td>
                    <td className="px-3 py-2">{nom.delivery_mode}</td>
                    <td className="px-3 py-2">{(nom.preferred_quarters ?? []).map((q: number) => `Q${q}`).join(', ')}</td>
                    <td className="px-3 py-2 font-semibold">{nom.num_nominations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Special requests */}
        {reg.special_requests && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-tfa-gray-400 uppercase tracking-wide mb-1">Special Requests</p>
            <p className="text-sm text-tfa-gray-700 bg-tfa-gray-50 p-3 rounded border border-tfa-gray-200">
              {reg.special_requests}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-tfa-gray-400 pt-4 border-t border-tfa-gray-100">
          <span>Submitted by: {reg.submitted_by || '—'} · PDPL: {reg.pdpl_authorized ? 'Authorized' : 'No'}</span>
          <span>{reg.submitted_at ? new Date(reg.submitted_at).toLocaleString() : '—'}</span>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function GroupRegistrationAdmin() {
  const [page, setPage] = useState(0)
  const [viewing, setViewing] = useState<GroupRegistrationOut | null>(null)
  const LIMIT = 20

  const { data, isLoading } = useQuery({
    queryKey: ['admin-group-registrations', page],
    queryFn: () => adminApi.listGroupRegistrations({ skip: page * LIMIT, limit: LIMIT }),
  })

  const handleExport = async () => {
    const res = await adminApi.exportGroupRegistrationsXlsx()
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = 'group_registrations.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleView = async (id: number) => {
    const res = await adminApi.getGroupRegistration(id)
    setViewing(res.data as GroupRegistrationOut)
  }

  if (isLoading) return <PageSpinner />

  const total   = data?.data?.total ?? 0
  const items: GroupRegistrationSummary[] = data?.data?.items ?? []
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-6">
      {viewing && <RegistrationDetailModal reg={viewing} onClose={() => setViewing(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tfa-gray-800">Group Registrations</h1>
          <p className="text-sm text-tfa-gray-500 mt-1">{total} submissions</p>
        </div>
        <Button variant="secondary" onClick={handleExport}>
          <Download className="h-4 w-4" /> Export Excel
        </Button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-tfa-gray-400">
          <p>No registrations submitted yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {items.map((r) => (
          <Card key={r.id}>
            <CardBody className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-tfa-gray-900">{r.organization_name}</p>
                  <Badge variant="info">{r.nomination_count} course{r.nomination_count !== 1 ? 's' : ''}</Badge>
                  <Badge variant={r.status === 'submitted' ? 'success' : 'default'}>{r.status}</Badge>
                </div>
                <p className="text-sm text-tfa-gray-500 mt-0.5">{r.focal_point_name} · {r.email}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-mono text-tfa-navy">{r.reference_number}</span>
                  {r.submitted_at && (
                    <span className="text-xs text-tfa-gray-400">
                      {new Date(r.submitted_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleView(r.id)}>
                View <ChevronRight className="h-4 w-4" />
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="text-sm text-tfa-gray-500">Page {page + 1} of {totalPages}</span>
          <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}
