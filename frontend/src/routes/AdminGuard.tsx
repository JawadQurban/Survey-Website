import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { adminApi } from '@/lib/api'
import { PageSpinner } from '@/components/ui/Spinner'
import type { AdminUser } from '@/types/admin'

interface AdminGuardProps {
  requiredPermission?: string
}

export function AdminGuard({ requiredPermission }: AdminGuardProps = {}) {
  const { setAdmin, isAuthenticated, can } = useAuthStore()

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

  // Permission check — only for routes that declare a required permission
  if (requiredPermission && !can(requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-2xl font-bold text-tfa-gray-800 mb-2">Access Denied</p>
          <p className="text-tfa-gray-500">You do not have permission to view this page.</p>
        </div>
      </div>
    )
  }

  return <Outlet />
}
