import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { adminApi } from '@/lib/api'
import { PageSpinner } from '@/components/ui/Spinner'
import type { AdminUser } from '@/types/admin'

export function AdminGuard() {
  const { setAdmin, isAuthenticated } = useAuthStore()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-me'],
    queryFn: () => adminApi.getMe(),
    retry: false,
    enabled: !isAuthenticated,
  })

  useEffect(() => {
    if (data?.data) setAdmin(data.data as AdminUser)
  }, [data])

  if (isLoading) return <PageSpinner />
  if (isError && !isAuthenticated) return <Navigate to="/admin/login" replace />
  if (!isAuthenticated && !data) return <Navigate to="/admin/login" replace />

  return <Outlet />
}
