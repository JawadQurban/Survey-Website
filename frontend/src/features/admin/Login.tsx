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
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="TFA" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-tfa-navy">Admin Portal</h1>
          <p className="text-sm text-tfa-gray-500 mt-1">The Financial Academy Survey Platform</p>
        </div>

        <div className="bg-white rounded-xl border border-tfa-gray-200 shadow-card p-8">
          {error && <Alert variant="error" className="mb-4">{error}</Alert>}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError('')
              loginMutation.mutate()
            }}
            className="space-y-5"
          >
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" loading={loginMutation.isPending}>
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
