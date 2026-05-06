import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { useLanguageStore } from '@/store/languageStore'
import { publicApi } from '@/lib/api'
import { t } from '@/lib/i18n'
import type { CourseCatalog, GroupRegistrationFormData, NominationRow } from '@/types/groupRegistration'
import { DELIVERY_MODES, SECTOR_LABELS } from '@/types/groupRegistration'
import { Plus, Trash2, AlertCircle } from 'lucide-react'

// ── Style constants ────────────────────────────────────────────────────────────
const INPUT = 'w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy'
const LABEL = 'text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide mb-1 block'
const SELECT = `${INPUT} bg-white`
const ERR = 'text-xs text-red-500 mt-1'
const SECTION_HEADER = 'bg-tfa-navy text-white text-sm font-semibold px-4 py-2.5 rounded-t'

// ── Empty nomination row ───────────────────────────────────────────────────────
function emptyRow(): NominationRow {
  return {
    id: `row_${Date.now()}_${Math.random()}`,
    sector: '',
    functional_area: '',
    course_code: '',
    course_title: '',
    delivery_mode: '',
    preferred_quarters: [],
    num_nominations: '',
  }
}

// ── Initial form state ─────────────────────────────────────────────────────────
const INITIAL: GroupRegistrationFormData = {
  organization_name: '',
  department: '',
  focal_point_name: '',
  focal_point_position: '',
  email: '',
  mobile: '',
  selected_sectors: [],
  selected_functional_areas: [],
  nominations: [emptyRow()],
  special_requests: '',
  submitted_by: '',
  pdpl_authorized: false,
}

// ── Validation ─────────────────────────────────────────────────────────────────
function validate(form: GroupRegistrationFormData): Record<string, string> {
  const e: Record<string, string> = {}
  if (!form.organization_name.trim()) e.organization_name = 'Required'
  if (!form.focal_point_name.trim()) e.focal_point_name = 'Required'
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    e.email = 'Valid email required'
  if (form.mobile && !/^(\+966|00966|05)\d{8}$/.test(form.mobile.replace(/\s/g, '')))
    e.mobile = 'Valid Saudi mobile required (e.g. 05XXXXXXXX)'
  if (form.nominations.length === 0) e.nominations = 'At least one training request is required'
  form.nominations.forEach((row, i) => {
    if (!row.sector)             e[`row_${i}_sector`]   = 'Required'
    if (!row.functional_area)    e[`row_${i}_area`]     = 'Required'
    if (!row.course_title)       e[`row_${i}_course`]   = 'Required'
    if (!row.delivery_mode)      e[`row_${i}_mode`]     = 'Required'
    if (row.preferred_quarters.length === 0) e[`row_${i}_quarter`] = 'Select at least one'
    if (!row.num_nominations || Number(row.num_nominations) < 1)
      e[`row_${i}_count`] = 'Min 1'
    if (Number(row.num_nominations) > 500)
      e[`row_${i}_count`] = 'Max 500'
  })
  if (!form.pdpl_authorized) e.pdpl_authorized = 'Authorization required'
  return e
}

// ── Component ──────────────────────────────────────────────────────────────────
export function GroupRegistrationForm() {
  const navigate = useNavigate()
  const { language, isRTL } = useLanguageStore()
  const [form, setForm] = useState<GroupRegistrationFormData>(INITIAL)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['gr-catalog'],
    queryFn: () => publicApi.getGroupRegCatalog(),
    staleTime: 5 * 60_000,
  })
  const catalog: CourseCatalog = catalogData?.data ?? {}
  const allSectors = Object.keys(catalog)

  const submitMutation = useMutation({
    mutationFn: (payload: object) => publicApi.submitGroupRegistration(payload),
    onSuccess: (res) => {
      navigate('thank-you', { state: { reference_number: res.data.reference_number } })
    },
  })

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const patch = (p: Partial<GroupRegistrationFormData>) =>
    setForm((f) => ({ ...f, ...p }))

  const toggleSector = (s: string) =>
    patch({
      selected_sectors: form.selected_sectors.includes(s)
        ? form.selected_sectors.filter((x) => x !== s)
        : [...form.selected_sectors, s],
    })

  const availableAreas = () => {
    const areas = new Set<string>()
    form.selected_sectors.forEach((s) => {
      Object.keys(catalog[s] ?? {}).forEach((a) => areas.add(a))
    })
    return Array.from(areas).sort()
  }

  const toggleArea = (a: string) =>
    patch({
      selected_functional_areas: form.selected_functional_areas.includes(a)
        ? form.selected_functional_areas.filter((x) => x !== a)
        : [...form.selected_functional_areas, a],
    })

  const updateRow = (id: string, patch: Partial<NominationRow>) =>
    setForm((f) => ({
      ...f,
      nominations: f.nominations.map((r) =>
        r.id === id ? { ...r, ...patch } : r
      ),
    }))

  const addRow = () =>
    setForm((f) => ({ ...f, nominations: [...f.nominations, emptyRow()] }))

  const removeRow = (id: string) =>
    setForm((f) => ({ ...f, nominations: f.nominations.filter((r) => r.id !== id) }))

  const handleRowSectorChange = (id: string, sector: string) =>
    updateRow(id, { sector, functional_area: '', course_code: '', course_title: '' })

  const handleRowAreaChange = (id: string, area: string) =>
    updateRow(id, { functional_area: area, course_code: '', course_title: '' })

  const handleRowCourseChange = (id: string, row: NominationRow, courseTitle: string) => {
    const course = (catalog[row.sector]?.[row.functional_area] ?? []).find(
      (c) => c.title === courseTitle
    )
    updateRow(id, {
      course_title: courseTitle,
      course_code: course?.code ?? '',
    })
  }

  const toggleQuarter = (id: string, q: number, row: NominationRow) => {
    const qs = row.preferred_quarters.includes(q)
      ? row.preferred_quarters.filter((x) => x !== q)
      : [...row.preferred_quarters, q].sort()
    updateRow(id, { preferred_quarters: qs })
  }

  const handleSubmit = () => {
    setSubmitted(true)
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const payload = {
      ...form,
      nominations: form.nominations.map(({ id: _id, ...rest }) => ({
        ...rest,
        num_nominations: Number(rest.num_nominations),
      })),
      language_used: language,
    }
    submitMutation.mutate(payload)
  }

  const fe = (k: string) => submitted && errors[k] ? errors[k] : ''

  if (catalogLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tfa-navy" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-5xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Page title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-tfa-gray-800">{t('gr.title', language)}</h1>
        <p className="text-sm text-tfa-gray-500 mt-1">{t('gr.subtitle', language)}</p>
      </div>

      {/* Global validation error banner */}
      {submitted && Object.keys(errors).length > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">
            {isRTL
              ? 'يرجى تصحيح الأخطاء المشار إليها أدناه قبل الإرسال.'
              : 'Please fix the errors below before submitting.'}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* ── Section 1: Organization Details ───────────────────────────────── */}
        <div className="border border-tfa-gray-200 rounded-lg overflow-hidden">
          <div className={SECTION_HEADER}>{t('gr.section1', language)}</div>
          <div className="p-5 space-y-4">
            <div>
              <label className={LABEL}>{t('gr.org_name', language)} <span className="text-red-400">*</span></label>
              <input className={INPUT} value={form.organization_name}
                onChange={(e) => patch({ organization_name: e.target.value })} />
              {fe('organization_name') && <p className={ERR}>{fe('organization_name')}</p>}
            </div>
            <div>
              <label className={LABEL}>{t('gr.department', language)}</label>
              <input className={INPUT} value={form.department}
                onChange={(e) => patch({ department: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>{t('gr.focal_name', language)} <span className="text-red-400">*</span></label>
                <input className={INPUT} value={form.focal_point_name}
                  onChange={(e) => patch({ focal_point_name: e.target.value })} />
                {fe('focal_point_name') && <p className={ERR}>{fe('focal_point_name')}</p>}
              </div>
              <div>
                <label className={LABEL}>{t('gr.focal_position', language)}</label>
                <input className={INPUT} value={form.focal_point_position}
                  onChange={(e) => patch({ focal_point_position: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>{t('gr.email', language)} <span className="text-red-400">*</span></label>
                <input className={INPUT} type="email" value={form.email}
                  onChange={(e) => patch({ email: e.target.value })} />
                {fe('email') && <p className={ERR}>{fe('email')}</p>}
              </div>
              <div>
                <label className={LABEL}>{t('gr.mobile', language)}</label>
                <input className={INPUT} type="tel" value={form.mobile}
                  placeholder="05XXXXXXXX"
                  onChange={(e) => patch({ mobile: e.target.value })} />
                {fe('mobile') && <p className={ERR}>{fe('mobile')}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Sector / Functional Area ───────────────────────────── */}
        <div className="border border-tfa-gray-200 rounded-lg overflow-hidden">
          <div className={SECTION_HEADER}>{t('gr.section2', language)}</div>
          <div className="p-5 space-y-4">
            <div>
              <label className={LABEL}>{t('gr.sector', language)}</label>
              <div className="flex flex-wrap gap-3">
                {allSectors.map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.selected_sectors.includes(s)}
                      onChange={() => toggleSector(s)}
                      className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy" />
                    <span className="text-sm text-tfa-gray-700">
                      {isRTL ? SECTOR_LABELS[s]?.ar : SECTOR_LABELS[s]?.en}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {form.selected_sectors.length > 0 && (
              <div>
                <label className={LABEL}>{t('gr.functional_area', language)}</label>
                <div className="flex flex-wrap gap-3">
                  {availableAreas().map((a) => (
                    <label key={a} className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" checked={form.selected_functional_areas.includes(a)}
                        onChange={() => toggleArea(a)}
                        className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy" />
                      <span className="text-sm text-tfa-gray-700">{a}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Section 3: Nominations Table ──────────────────────────────────── */}
        <div className="border border-tfa-gray-200 rounded-lg overflow-hidden">
          <div className={SECTION_HEADER}>{t('gr.section3', language)}</div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-tfa-gray-500">{t('gr.section3_note', language)}</p>
            {fe('nominations') && <p className={ERR}>{fe('nominations')}</p>}

            {/* Table header — hidden on small screens */}
            <div className="hidden lg:grid grid-cols-[32px_1fr_1fr_90px_1fr_110px_120px_90px_36px] gap-2 px-3 py-1.5 bg-tfa-gray-50 rounded border border-tfa-gray-200 text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide">
              <span>#</span>
              <span>{t('gr.col_sector', language)}</span>
              <span>{t('gr.col_area', language)}</span>
              <span>{t('gr.col_code', language)}</span>
              <span>{t('gr.col_title', language)}</span>
              <span>{t('gr.col_mode', language)}</span>
              <span>{t('gr.col_quarter', language)}</span>
              <span>{t('gr.col_nominations', language)}</span>
              <span />
            </div>

            {form.nominations.map((row, idx) => {
              const areasForRow   = Object.keys(catalog[row.sector] ?? {}).sort()
              const coursesForRow = catalog[row.sector]?.[row.functional_area] ?? []

              return (
                <div key={row.id} className="border border-tfa-gray-200 rounded-lg p-3 space-y-3 lg:space-y-0 lg:grid lg:grid-cols-[32px_1fr_1fr_90px_1fr_110px_120px_90px_36px] lg:gap-2 lg:items-start">
                  {/* # */}
                  <span className="hidden lg:flex items-center justify-center text-xs font-mono text-tfa-gray-400 pt-2">
                    {idx + 1}
                  </span>

                  {/* Sector */}
                  <div>
                    <label className="lg:hidden text-xs font-semibold text-tfa-gray-500 mb-1 block">{t('gr.col_sector', language)}</label>
                    <select className={SELECT} value={row.sector}
                      onChange={(e) => handleRowSectorChange(row.id, e.target.value)}>
                      <option value="">{t('gr.select_sector', language)}</option>
                      {allSectors.map((s) => (
                        <option key={s} value={s}>{isRTL ? SECTOR_LABELS[s]?.ar : SECTOR_LABELS[s]?.en}</option>
                      ))}
                    </select>
                    {fe(`row_${idx}_sector`) && <p className={ERR}>{fe(`row_${idx}_sector`)}</p>}
                  </div>

                  {/* Functional Area */}
                  <div>
                    <label className="lg:hidden text-xs font-semibold text-tfa-gray-500 mb-1 block">{t('gr.col_area', language)}</label>
                    <select className={SELECT} value={row.functional_area}
                      disabled={!row.sector}
                      onChange={(e) => handleRowAreaChange(row.id, e.target.value)}>
                      <option value="">{t('gr.select_area', language)}</option>
                      {areasForRow.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                    {fe(`row_${idx}_area`) && <p className={ERR}>{fe(`row_${idx}_area`)}</p>}
                  </div>

                  {/* Course Code (auto) */}
                  <div>
                    <label className="lg:hidden text-xs font-semibold text-tfa-gray-500 mb-1 block">{t('gr.col_code', language)}</label>
                    <input className={`${INPUT} font-mono bg-tfa-gray-50`} readOnly
                      value={row.course_code} placeholder="Auto" />
                  </div>

                  {/* Course Title */}
                  <div>
                    <label className="lg:hidden text-xs font-semibold text-tfa-gray-500 mb-1 block">{t('gr.col_title', language)}</label>
                    <select className={SELECT} value={row.course_title}
                      disabled={!row.functional_area}
                      onChange={(e) => handleRowCourseChange(row.id, row, e.target.value)}>
                      <option value="">{t('gr.select_course', language)}</option>
                      {coursesForRow.map((c) => (
                        <option key={c.code} value={c.title}>{c.title}</option>
                      ))}
                    </select>
                    {fe(`row_${idx}_course`) && <p className={ERR}>{fe(`row_${idx}_course`)}</p>}
                  </div>

                  {/* Delivery Mode */}
                  <div>
                    <label className="lg:hidden text-xs font-semibold text-tfa-gray-500 mb-1 block">{t('gr.col_mode', language)}</label>
                    <select className={SELECT} value={row.delivery_mode}
                      onChange={(e) => updateRow(row.id, { delivery_mode: e.target.value })}>
                      <option value="">—</option>
                      {DELIVERY_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {fe(`row_${idx}_mode`) && <p className={ERR}>{fe(`row_${idx}_mode`)}</p>}
                  </div>

                  {/* Preferred Quarter */}
                  <div>
                    <label className="lg:hidden text-xs font-semibold text-tfa-gray-500 mb-1 block">{t('gr.col_quarter', language)}</label>
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {[1, 2, 3, 4].map((q) => (
                        <label key={q} className="flex items-center gap-1 cursor-pointer select-none">
                          <input type="checkbox"
                            checked={row.preferred_quarters.includes(q)}
                            onChange={() => toggleQuarter(row.id, q, row)}
                            className="h-3.5 w-3.5 rounded border-tfa-gray-300 text-tfa-navy" />
                          <span className="text-xs text-tfa-gray-700">Q{q}</span>
                        </label>
                      ))}
                    </div>
                    {fe(`row_${idx}_quarter`) && <p className={ERR}>{fe(`row_${idx}_quarter`)}</p>}
                  </div>

                  {/* No. of Nominations */}
                  <div>
                    <label className="lg:hidden text-xs font-semibold text-tfa-gray-500 mb-1 block">{t('gr.col_nominations', language)}</label>
                    <input type="number" min={1} max={500} className={INPUT}
                      value={row.num_nominations}
                      onChange={(e) => updateRow(row.id, { num_nominations: e.target.value === '' ? '' : Number(e.target.value) })} />
                    {fe(`row_${idx}_count`) && <p className={ERR}>{fe(`row_${idx}_count`)}</p>}
                  </div>

                  {/* Remove row */}
                  <div className="flex items-start pt-1">
                    <button type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={form.nominations.length === 1}
                      className="p-1.5 rounded hover:bg-red-50 text-tfa-gray-300 hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Remove row">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}

            <Button variant="secondary" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4" /> {t('gr.add_row', language)}
            </Button>
          </div>
        </div>

        {/* ── Section 4: Special Requests ───────────────────────────────────── */}
        <div className="border border-tfa-gray-200 rounded-lg overflow-hidden">
          <div className={SECTION_HEADER}>{t('gr.section4', language)}</div>
          <div className="p-5">
            <textarea
              className={`${INPUT} resize-none`} rows={4}
              placeholder={t('gr.special_requests', language)}
              value={form.special_requests}
              onChange={(e) => patch({ special_requests: e.target.value })}
            />
          </div>
        </div>

        {/* ── Section 5: Authorization ──────────────────────────────────────── */}
        <div className="border border-tfa-gray-200 rounded-lg overflow-hidden">
          <div className={SECTION_HEADER}>{t('gr.section5', language)}</div>
          <div className="p-5 space-y-4">
            <div>
              <label className={LABEL}>{t('gr.submitted_by', language)}</label>
              <input className={INPUT} value={form.submitted_by}
                onChange={(e) => patch({ submitted_by: e.target.value })} />
            </div>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input type="checkbox" checked={form.pdpl_authorized}
                onChange={(e) => patch({ pdpl_authorized: e.target.checked })}
                className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy mt-0.5 shrink-0" />
              <span className="text-sm text-tfa-gray-600 leading-relaxed">
                {t('gr.pdpl', language)}
              </span>
            </label>
            {fe('pdpl_authorized') && <p className={ERR}>{fe('pdpl_authorized')}</p>}
          </div>
        </div>

        {/* Submit button */}
        {submitMutation.isError && (
          <p className="text-sm text-red-500">
            {isRTL ? 'حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.' : 'An error occurred. Please try again.'}
          </p>
        )}
        <div className="flex justify-end">
          <Button size="lg" onClick={handleSubmit} loading={submitMutation.isPending}
            disabled={submitMutation.isPending}>
            {submitMutation.isPending ? t('gr.submitting', language) : t('gr.submit', language)}
          </Button>
        </div>
      </div>
    </div>
  )
}
