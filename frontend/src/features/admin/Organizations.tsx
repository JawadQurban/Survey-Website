import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageSpinner } from '@/components/ui/Spinner'
import { adminApi } from '@/lib/api'
import type { Organization } from '@/types/admin'
import { Plus, Pencil, Building2 } from 'lucide-react'

export function Organizations() {
  const [showForm, setShowForm] = useState(false)
  const [editOrg, setEditOrg] = useState<Organization | null>(null)
  const [nameEn, setNameEn] = useState('')
  const [nameAr, setNameAr] = useState('')
  const [sector, setSector] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orgs'],
    queryFn: () => adminApi.listOrganizations(),
  })

  const createMutation = useMutation({
    mutationFn: () => adminApi.createOrganization({ name_en: nameEn, name_ar: nameAr, sector }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orgs'] })
      setShowForm(false)
      setNameEn('')
      setNameAr('')
      setSector('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => adminApi.updateOrganization(editOrg!.id, { name_en: nameEn, name_ar: nameAr, sector }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orgs'] })
      setEditOrg(null)
    },
  })

  const toggleActive = useMutation({
    mutationFn: (org: Organization) => adminApi.updateOrganization(org.id, { is_active: !org.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orgs'] }),
  })

  const handleEdit = (org: Organization) => {
    setEditOrg(org)
    setNameEn(org.name_en)
    setNameAr(org.name_ar ?? '')
    setSector(org.sector ?? '')
  }

  if (isLoading) return <PageSpinner />

  const orgs = (data?.data as Organization[]) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tfa-gray-800">Organizations</h1>
          <p className="text-sm text-tfa-gray-500 mt-1">{orgs.length} total</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Organization
        </Button>
      </div>

      {(showForm || editOrg) && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-tfa-gray-800">
              {editOrg ? 'Edit Organization' : 'New Organization'}
            </h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Input label="Name (English)" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required />
              <Input label="Name (Arabic)" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
              <Input label="Sector" value={sector} onChange={(e) => setSector(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => editOrg ? updateMutation.mutate() : createMutation.mutate()}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editOrg ? 'Save Changes' : 'Create'}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setEditOrg(null) }}>
                Cancel
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="space-y-2">
        {orgs.length === 0 && (
          <div className="text-center py-12 text-tfa-gray-400">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No organizations yet. Add one to get started.</p>
          </div>
        )}
        {orgs.map((org) => (
          <Card key={org.id}>
            <CardBody className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-tfa-gray-900">{org.name_en}</p>
                  {org.name_ar && (
                    <span className="text-tfa-gray-400 text-sm" dir="rtl">{org.name_ar}</span>
                  )}
                  <Badge variant={org.is_active ? 'success' : 'default'}>
                    {org.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-tfa-gray-400 mt-0.5">{org.sector ?? 'No sector'} · /{org.slug}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(org)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleActive.mutate(org)}
                >
                  {org.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}
