import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BarChart2, MessageSquare, Filter } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { adminApi } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────
interface OptionStat {
  option_key: string
  text_en: string
  text_ar: string | null
  count: number
  percentage: number
}

interface QuestionStat {
  question_id: number
  question_key: string
  question_text_en: string
  question_text_ar: string | null
  question_type: string
  is_intro: boolean
  section_title_en: string
  section_title_ar: string | null
  response_count: number
  options: OptionStat[] | null
  open_text_responses: string[] | null
}

interface AnalyticsData {
  survey: { id: number; slug: string; title_en: string; title_ar: string | null }
  total_submissions: number
  role_counts: Record<string, number>
  questions: QuestionStat[]
}

// ─── Horizontal bar chart for choice questions ────────────────────────────────
function OptionBar({ option, maxPct }: { option: OptionStat; maxPct: number }) {
  const barWidth = maxPct > 0 ? (option.percentage / maxPct) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-tfa-gray-700 leading-snug flex-1">{option.text_en}</span>
        <span className="text-tfa-gray-500 shrink-0 font-mono text-xs">
          {option.count} &nbsp;·&nbsp; {option.percentage}%
        </span>
      </div>
      <div className="h-5 bg-tfa-gray-100 rounded overflow-hidden">
        <div
          className="h-full bg-tfa-navy rounded transition-all duration-500"
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  )
}

// ─── Question card ────────────────────────────────────────────────────────────
function QuestionCard({ q }: { q: QuestionStat }) {
  const [showAll, setShowAll] = useState(false)
  const maxPct = q.options ? Math.max(...q.options.map((o) => o.percentage), 0) : 0
  const isChoice = q.options !== null
  const hasOpenText = q.open_text_responses && q.open_text_responses.length > 0
  const responses = q.open_text_responses ?? []
  const visibleResponses = showAll ? responses : responses.slice(0, 5)

  return (
    <Card>
      <CardBody className="space-y-4">
        {/* Question header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-tfa-gray-800 leading-snug">{q.question_text_en}</p>
            {q.question_text_ar && (
              <p className="text-sm text-tfa-gray-400 mt-0.5" dir="rtl">{q.question_text_ar}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="default">
              {q.response_count} {q.response_count === 1 ? 'response' : 'responses'}
            </Badge>
            {q.is_intro && <Badge variant="info">Intro</Badge>}
          </div>
        </div>

        {/* Choice question bars */}
        {isChoice && q.response_count > 0 && q.options && (
          <div className="space-y-3">
            {q.options.map((opt) => (
              <OptionBar key={opt.option_key} option={opt} maxPct={maxPct} />
            ))}
          </div>
        )}

        {/* Open text responses */}
        {hasOpenText && (
          <div className="space-y-2">
            {isChoice && (
              <p className="text-xs font-semibold text-tfa-gray-400 uppercase tracking-wide">
                Other / open responses
              </p>
            )}
            <div className="space-y-2">
              {visibleResponses.map((text, i) => (
                <div key={i} className="bg-tfa-gray-50 rounded px-3 py-2 text-sm text-tfa-gray-700 leading-relaxed">
                  {text}
                </div>
              ))}
            </div>
            {responses.length > 5 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="text-xs text-tfa-navy hover:underline"
              >
                {showAll ? 'Show less' : `Show all ${responses.length} responses`}
              </button>
            )}
          </div>
        )}

        {/* No answers yet */}
        {q.response_count === 0 && (
          <p className="text-sm text-tfa-gray-400 italic">No responses yet.</p>
        )}
      </CardBody>
    </Card>
  )
}

// ─── Section group ────────────────────────────────────────────────────────────
function SectionGroup({ title, questions }: { title: string; questions: QuestionStat[] }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-tfa-gray-500 uppercase tracking-wide px-1">
        {title}
      </h3>
      {questions.map((q) => (
        <QuestionCard key={q.question_id} q={q} />
      ))}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-tfa-gray-200 rounded-lg px-5 py-4">
      <p className="text-xs font-semibold text-tfa-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-tfa-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-tfa-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function SurveyAnalytics() {
  const { surveyId } = useParams<{ surveyId: string }>()
  const navigate = useNavigate()

  const [role, setRole]         = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [applied, setApplied]   = useState<{ role: string; dateFrom: string; dateTo: string }>({
    role: '', dateFrom: '', dateTo: '',
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['survey-analytics', surveyId, applied],
    queryFn: () =>
      adminApi.getSurveyAnalytics(Number(surveyId), {
        role:      applied.role      || undefined,
        date_from: applied.dateFrom  || undefined,
        date_to:   applied.dateTo    || undefined,
      }),
    enabled: !!surveyId,
  })

  const analytics: AnalyticsData | undefined = data?.data

  const applyFilters = () => setApplied({ role, dateFrom, dateTo })
  const clearFilters = () => {
    setRole(''); setDateFrom(''); setDateTo('')
    setApplied({ role: '', dateFrom: '', dateTo: '' })
  }
  const hasFilters = applied.role || applied.dateFrom || applied.dateTo

  // Group questions by section (exclude skipped types like rating/number with no options)
  const grouped: Record<string, QuestionStat[]> = {}
  const introQuestions: QuestionStat[] = []
  for (const q of analytics?.questions ?? []) {
    if (q.options === null && q.open_text_responses === null) continue
    if (q.is_intro) {
      introQuestions.push(q)
    } else {
      const key = q.section_title_en
      grouped[key] = grouped[key] ?? []
      grouped[key].push(q)
    }
  }

  const roleLabelMap: Record<string, string> = { ceo: 'CEO', chro: 'CHRO', ld: 'L&D' }

  if (isLoading) return <PageSpinner />

  if (isError || !analytics) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/surveys')}>
          <ArrowLeft className="h-4 w-4" /> Back to Surveys
        </Button>
        <p className="text-red-500">Failed to load analytics. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/admin/surveys')}
          className="mt-1 p-1.5 rounded-lg hover:bg-tfa-gray-100 text-tfa-gray-400 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-tfa-gray-800">{analytics.survey.title_en}</h1>
          {analytics.survey.title_ar && (
            <p className="text-sm text-tfa-gray-400 mt-0.5" dir="rtl">{analytics.survey.title_ar}</p>
          )}
          <p className="text-xs text-tfa-gray-400 font-mono mt-1">/{analytics.survey.slug}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-tfa-gray-200 rounded-lg px-5 py-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-tfa-gray-600">
          <Filter className="h-4 w-4" /> Filters
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs font-normal text-tfa-gray-400 hover:text-red-500 ml-2">
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="text-xs font-semibold text-tfa-gray-400 uppercase tracking-wide block mb-1">
              Respondent Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border border-tfa-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
            >
              <option value="">All Roles</option>
              <option value="ceo">CEO</option>
              <option value="chro">CHRO</option>
              <option value="ld">L&amp;D</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-tfa-gray-400 uppercase tracking-wide block mb-1">
              Submitted From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-tfa-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-tfa-gray-400 uppercase tracking-wide block mb-1">
              Submitted To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-tfa-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy"
            />
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={applyFilters}>Apply</Button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Submitted"
          value={analytics.total_submissions}
          sub={hasFilters ? 'filtered' : 'all time'}
        />
        {(['ceo', 'chro', 'ld'] as const).map((r) => (
          <StatCard
            key={r}
            label={roleLabelMap[r]}
            value={analytics.role_counts[r] ?? 0}
            sub="submissions"
          />
        ))}
      </div>

      {analytics.total_submissions === 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          <BarChart2 className="h-4 w-4 shrink-0" />
          <span>
            {hasFilters
              ? 'No submitted responses match these filters.'
              : 'No submitted responses yet — questions are shown with 0 counts.'}
          </span>
          {hasFilters && (
            <button onClick={clearFilters} className="ml-auto text-xs font-medium hover:underline shrink-0">
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Questions — always rendered so the structure is visible even before submissions arrive */}
      {introQuestions.length === 0 && Object.keys(grouped).length === 0 ? (
        <div className="text-center py-10 text-tfa-gray-400">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No choice or open-text questions found in this survey.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {introQuestions.length > 0 && (
            <SectionGroup title="Intro Questions" questions={introQuestions} />
          )}
          {Object.entries(grouped).map(([sectionTitle, questions]) => (
            <SectionGroup key={sectionTitle} title={sectionTitle} questions={questions} />
          ))}
        </div>
      )}
    </div>
  )
}
