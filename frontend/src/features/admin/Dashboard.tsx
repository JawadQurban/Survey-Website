import { useQuery } from '@tanstack/react-query'
import { Card, CardBody } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { adminApi } from '@/lib/api'
import type { DashboardData } from '@/types/admin'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <Card className={accent ? 'border-tfa-navy' : ''}>
      <CardBody>
        <p className="text-sm text-tfa-gray-500 font-medium">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${accent ? 'text-tfa-navy' : 'text-tfa-gray-900'}`}>
          {value}
        </p>
        {sub && <p className="text-xs text-tfa-gray-400 mt-1">{sub}</p>}
      </CardBody>
    </Card>
  )
}

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard(),
    refetchInterval: 60_000,
  })

  if (isLoading) return <PageSpinner />

  const d = data?.data as DashboardData

  const roleLabels: Record<string, string> = {
    ceo: 'CEO',
    chro: 'CHRO',
    ld: 'L&D Leader',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-tfa-navy">Dashboard</h1>
        <p className="text-sm text-tfa-gray-500 mt-1">Survey platform overview</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Organizations" value={d?.total_organizations ?? 0} />
        <StatCard label="Invited Contacts" value={d?.total_contacts ?? 0} />
        <StatCard label="Active Surveys" value={d?.active_surveys ?? 0} />
        <StatCard
          label="Completion Rate"
          value={`${d?.submissions?.completion_rate_pct ?? 0}%`}
          sub={`${d?.submissions?.submitted ?? 0} submitted`}
          accent
        />
      </div>

      {/* Submissions breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-tfa-gray-800 mb-4">Submission Status</h2>
            <div className="space-y-3">
              {[
                { label: 'Submitted', value: d?.submissions?.submitted ?? 0, color: 'bg-green-500' },
                { label: 'In Progress (Draft)', value: d?.submissions?.draft ?? 0, color: 'bg-amber-400' },
              ].map(({ label, value, color }) => {
                const total = d?.submissions?.total || 1
                const pct = Math.round((value / total) * 100)
                return (
                  <div key={label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-tfa-gray-600">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                    <div className="h-2 bg-tfa-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-tfa-gray-800 mb-4">Completion by Role</h2>
            <div className="space-y-3">
              {Object.entries(d?.role_completion ?? {}).map(([role, counts]) => {
                const { completed, total } = counts as { completed: number; total: number }
                const pct = total ? Math.round((completed / total) * 100) : 0
                return (
                  <div key={role}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-tfa-gray-600">{roleLabels[role] ?? role}</span>
                      <span className="font-semibold">{completed}/{total}</span>
                    </div>
                    <div className="h-2 bg-tfa-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-tfa-navy rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
