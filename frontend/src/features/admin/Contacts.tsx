import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { adminApi } from '@/lib/api'
import { getTranslation } from '@/lib/i18n'
import type { Contact, Organization } from '@/types/admin'
import type { Survey } from '@/types/survey'
import { Plus, Trash2, Users } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'ceo',  label: 'CEO / Executive Level' },
  { value: 'chro', label: 'CHRO / Head of HR' },
  { value: 'ld',   label: 'L&D Leader' },
]

const ROLE_LABELS: Record<string, string> = { ceo: 'CEO', chro: 'CHRO', ld: 'L&D' }

const SELECT_CLS =
  'w-full rounded border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy bg-white'

export function Contacts() {
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('ceo')
  const [orgId, setOrgId] = useState('')
  const [surveyId, setSurveyId] = useState('')
  const [formError, setFormError] = useState('')
  const qc = useQueryClient()

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['admin-contacts'],
    queryFn: () => adminApi.listContacts(),
  })

  const { data: orgsData } = useQuery({
    queryKey: ['admin-orgs'],
    queryFn: () => adminApi.listOrganizations(),
  })

  const { data: surveysData } = useQuery({
    queryKey: ['admin-surveys'],
    queryFn: () => adminApi.listSurveys(),
  })

  const resetForm = () => {
    setEmail('')
    setFullName('')
    setRole('ceo')
    setOrgId('')
    setSurveyId('')
    setFormError('')
    setShowForm(false)
  }

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createContact({
        email,
        full_name: fullName || null,
        role,
        organization_id: Number(orgId),
        survey_id: surveyId ? Number(surveyId) : null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-contacts'] })
      resetForm()
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setFormError(err.response?.data?.detail ?? 'Failed to create contact')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteContact(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-contacts'] }),
  })

  if (isLoading) return <PageSpinner />

  const contacts = (contactsData?.data as Contact[]) ?? []
  const orgs = (orgsData?.data as Organization[]) ?? []
  const surveys = (surveysData?.data as Survey[]) ?? []

  const surveyMap = new Map(surveys.map((s) => [s.id, getTranslation(s.translations, 'en')?.title ?? s.slug]))

  const handleCreate = () => {
    if (!orgId) return setFormError('Please select an organization')
    if (!email) return setFormError('Email is required')
    if (!surveyId) return setFormError('Please assign a survey')
    setFormError('')
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tfa-gray-800">Contacts</h1>
          <p className="text-sm text-tfa-gray-500 mt-1">{contacts.length} invited respondents</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Add Contact
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><h2 className="font-semibold text-tfa-gray-800">New Contact</h2></CardHeader>
          <CardBody>
            {formError && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{formError}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-tfa-gray-700 block mb-1">Organization <span className="text-red-500">*</span></label>
                <select className={SELECT_CLS} value={orgId} onChange={(e) => setOrgId(e.target.value)}>
                  <option value="">Select organization...</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name_en}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-tfa-gray-700 block mb-1">Survey <span className="text-red-500">*</span></label>
                <select className={SELECT_CLS} value={surveyId} onChange={(e) => setSurveyId(e.target.value)}>
                  <option value="">Select survey...</option>
                  {surveys.map((s) => (
                    <option key={s.id} value={s.id}>
                      {getTranslation(s.translations, 'en')?.title ?? s.slug}
                      {!s.is_active ? ' (inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="name@organization.com"
              />

              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Optional"
              />

              <div>
                <label className="text-sm font-medium text-tfa-gray-700 block mb-1">Role <span className="text-red-500">*</span></label>
                <select className={SELECT_CLS} value={role} onChange={(e) => setRole(e.target.value)}>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleCreate} loading={createMutation.isPending}>Add Contact</Button>
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-tfa-gray-200">
              {['Name', 'Email', 'Role', 'Organization', 'Survey', 'Status', ''].map((h) => (
                <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => {
              const org = orgs.find((o) => o.id === c.organization_id)
              const surveyTitle = c.survey_id ? (surveyMap.get(c.survey_id) ?? `Survey #${c.survey_id}`) : '—'
              return (
                <tr key={c.id} className="border-b border-tfa-gray-100 hover:bg-tfa-gray-50">
                  <td className="py-3 px-3 font-medium text-tfa-gray-800">{c.full_name ?? '—'}</td>
                  <td className="py-3 px-3 text-tfa-gray-600">{c.email}</td>
                  <td className="py-3 px-3"><Badge variant="info">{ROLE_LABELS[c.role] ?? c.role}</Badge></td>
                  <td className="py-3 px-3 text-tfa-gray-600">{org?.name_en ?? `Org #${c.organization_id}`}</td>
                  <td className="py-3 px-3 text-tfa-gray-600 text-xs">{surveyTitle}</td>
                  <td className="py-3 px-3"><Badge variant={c.is_active ? 'success' : 'default'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="py-3 px-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Remove ${c.email}?`)) deleteMutation.mutate(c.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {contacts.length === 0 && (
          <div className="text-center py-12 text-tfa-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No contacts yet. Add contacts and assign them to a survey.</p>
          </div>
        )}
      </div>
    </div>
  )
}
