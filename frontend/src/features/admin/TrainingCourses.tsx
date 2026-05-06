import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { adminApi } from '@/lib/api'
import type { TrainingCourse } from '@/types/groupRegistration'
import { Plus, Pencil, X } from 'lucide-react'

const INPUT  = 'w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy'
const LABEL  = 'text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide mb-1 block'
const SECTORS = ['BUSINESS', 'SUPPORT', 'OPERATIONS', 'CONTROL']

interface CourseForm {
  sector:          string
  functional_area: string
  course_code:     string
  course_title:    string
  duration_days:   string
  capacity:        string
}
const EMPTY_FORM: CourseForm = {
  sector: '', functional_area: '', course_code: '',
  course_title: '', duration_days: '3', capacity: '25',
}

function CourseModal({
  course, onClose,
}: { course?: TrainingCourse; onClose: () => void }) {
  const [form, setForm] = useState<CourseForm>(
    course
      ? {
          sector:          course.sector,
          functional_area: course.functional_area,
          course_code:     course.course_code,
          course_title:    course.course_title,
          duration_days:   String(course.duration_days ?? 3),
          capacity:        String(course.capacity),
        }
      : EMPTY_FORM
  )
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: () => {
      const payload = {
        sector:          form.sector,
        functional_area: form.functional_area,
        course_code:     form.course_code,
        course_title:    form.course_title,
        duration_days:   form.duration_days ? Number(form.duration_days) : null,
        capacity:        Number(form.capacity),
      }
      return course
        ? adminApi.updateTrainingCourse(course.id, payload)
        : adminApi.createTrainingCourse(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-training-courses'] })
      onClose()
    },
    onError: (err: any) => setError(err?.response?.data?.detail ?? 'Failed to save'),
  })

  const handleSubmit = () => {
    if (!form.sector || !form.functional_area || !form.course_code || !form.course_title)
      return setError('All fields except duration are required')
    setError('')
    mut.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded border border-tfa-gray-200 shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-tfa-gray-800">{course ? 'Edit Course' : 'Add Course'}</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-tfa-gray-100 text-tfa-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Sector <span className="text-red-400">*</span></label>
              <select className={INPUT} value={form.sector}
                onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}>
                <option value="">— Select —</option>
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Functional Area <span className="text-red-400">*</span></label>
              <input className={INPUT} value={form.functional_area}
                placeholder="e.g. Corporate Banking"
                onChange={(e) => setForm((f) => ({ ...f, functional_area: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Course Code <span className="text-red-400">*</span></label>
              <input className={`${INPUT} font-mono`} value={form.course_code}
                placeholder="FABTS261101"
                onChange={(e) => setForm((f) => ({ ...f, course_code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className={LABEL}>Duration (days)</label>
              <input type="number" min={1} className={INPUT} value={form.duration_days}
                onChange={(e) => setForm((f) => ({ ...f, duration_days: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Course Title <span className="text-red-400">*</span></label>
            <input className={INPUT} value={form.course_title}
              onChange={(e) => setForm((f) => ({ ...f, course_title: e.target.value }))} />
          </div>
          <div>
            <label className={LABEL}>Capacity (max participants)</label>
            <input type="number" min={1} className={INPUT} value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSubmit} loading={mut.isPending} className="flex-1">
            {course ? 'Save Changes' : 'Add Course'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

export function TrainingCourses() {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<TrainingCourse | null>(null)
  const [sectorFilter, setSectorFilter] = useState<string>('all')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-training-courses'],
    queryFn: () => adminApi.listTrainingCourses(),
  })

  const deactivateMut = useMutation({
    mutationFn: (id: number) => adminApi.deactivateTrainingCourse(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-training-courses'] }),
  })

  if (isLoading) return <PageSpinner />

  const allCourses: TrainingCourse[] = data?.data ?? []
  const filtered = sectorFilter === 'all'
    ? allCourses
    : allCourses.filter((c) => c.sector === sectorFilter)

  // Group by sector → functional_area
  const grouped: Record<string, Record<string, TrainingCourse[]>> = {}
  filtered.forEach((c) => {
    const s = grouped[c.sector] ??= {}
    const a = s[c.functional_area] ??= []
    a.push(c)
  })

  return (
    <div className="space-y-6">
      {(showAdd || editing) && (
        <CourseModal
          course={editing ?? undefined}
          onClose={() => { setShowAdd(false); setEditing(null) }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tfa-gray-800">Training Course Catalog</h1>
          <p className="text-sm text-tfa-gray-500 mt-1">{allCourses.length} courses · {allCourses.filter(c => c.is_active).length} active</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" /> Add Course
        </Button>
      </div>

      {/* Sector filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-tfa-gray-500 uppercase tracking-wide">Sector:</span>
        {(['all', ...SECTORS] as const).map((s) => (
          <button key={s} onClick={() => setSectorFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              sectorFilter === s ? 'bg-tfa-navy text-white' : 'bg-tfa-gray-100 text-tfa-gray-600 hover:bg-tfa-gray-200'
            }`}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {/* Grouped list */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([sector, areas]) => (
          <div key={sector}>
            <h2 className="text-sm font-bold text-tfa-gray-500 uppercase tracking-widest mb-3">{sector}</h2>
            <div className="space-y-4">
              {Object.entries(areas).map(([area, courses]) => (
                <div key={area}>
                  <p className="text-xs font-semibold text-tfa-gray-400 mb-2 pl-1">{area}</p>
                  <div className="space-y-2">
                    {courses.map((c) => (
                      <Card key={c.id}>
                        <CardBody className="flex items-center justify-between gap-4 py-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="font-mono text-xs text-tfa-navy bg-tfa-navy/10 px-2 py-0.5 rounded shrink-0">
                              {c.course_code}
                            </span>
                            <span className="text-sm font-medium text-tfa-gray-800 truncate">{c.course_title}</span>
                            {c.duration_days && (
                              <span className="text-xs text-tfa-gray-400 shrink-0">{c.duration_days}d</span>
                            )}
                            <Badge variant={c.is_active ? 'success' : 'default'}>
                              {c.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {c.is_active && (
                              <button
                                onClick={() => {
                                  if (!window.confirm(`Deactivate "${c.course_title}"?`)) return
                                  deactivateMut.mutate(c.id)
                                }}
                                className="px-2 py-1 rounded text-xs text-tfa-gray-400 hover:bg-red-50 hover:text-red-500"
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
