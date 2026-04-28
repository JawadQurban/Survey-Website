import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useAuthStore } from '@/store/authStore'
import { adminApi } from '@/lib/api'
import type { AdminUser } from '@/types/admin'

export function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setAdmin } = useAuthStore()

  const loginMutation = useMutation({
    mutationFn: () => adminApi.login(email, password),
    onSuccess: async () => {
      const me = await adminApi.getMe()
      setAdmin(me.data as AdminUser)
      navigate('/admin/dashboard')
    },
    onError: () => setError('Invalid email or password. Please try again.'),
  })

  return (
    <div className="min-h-screen bg-tfa-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-tfa-navy px-6 py-5 rounded-t flex items-center gap-3">
          <img src="/logo.svg" alt="TFA" className="h-8 w-auto brightness-0 invert" />
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Admin Portal</p>
            <p className="text-white/60 text-xs">The Financial Academy</p>
          </div>
        </div>

        <div className="bg-white border border-tfa-gray-200 border-t-0 rounded-b px-6 py-6 shadow-card">
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              loginMutation.mutate()
            }}
            className="space-y-4"
          >
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="admin@fa.gov.sa"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <Button type="submit" className="w-full mt-2" loading={loginMutation.isPending}>
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
