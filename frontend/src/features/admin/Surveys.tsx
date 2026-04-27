import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { adminApi } from '@/lib/api'
import type { Survey } from '@/types/survey'
import { getTranslation } from '@/lib/i18n'
import { ClipboardList, ExternalLink } from 'lucide-react'

export function Surveys() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-surveys'],
    queryFn: () => adminApi.listSurveys(),
  })

  if (isLoading) return <PageSpinner />

  const surveys = (data?.data as Survey[]) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-tfa-navy">Surveys</h1>
        <p className="text-sm text-tfa-gray-500 mt-1">{surveys.length} surveys configured</p>
      </div>

      {surveys.length === 0 && (
        <div className="text-center py-12 text-tfa-gray-400">
          <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No surveys yet. Run the seed script to import from Excel.</p>
          <code className="text-xs mt-2 block bg-tfa-gray-100 rounded px-3 py-2 w-fit mx-auto">
            python scripts/seed_survey.py --xlsx ../04262027_TFA*.xlsx
          </code>
        </div>
      )}

      <div className="space-y-3">
        {surveys.map((s) => {
          const titleEn = getTranslation(s.translations, 'en')?.title ?? s.slug
          const titleAr = getTranslation(s.translations, 'ar')?.title

          return (
            <Card key={s.id}>
              <CardBody className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-tfa-gray-900">{titleEn}</p>
                    <Badge variant={s.is_active ? 'success' : 'default'}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {s.is_fs_only && <Badge variant="info">FS Only</Badge>}
                  </div>
                  {titleAr && <p className="text-sm text-tfa-gray-400 mt-0.5" dir="rtl">{titleAr}</p>}
                  <p className="text-xs text-tfa-gray-400 mt-1">/{s.slug}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/admin/surveys/${s.id}/builder`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Builder
                  </Button>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
