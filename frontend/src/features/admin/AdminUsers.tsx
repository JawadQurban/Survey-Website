import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { PageSpinner } from '@/components/ui/Spinner'
import { adminApi } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import {
  Plus, X, KeyRound, ShieldCheck, ShieldOff,
  UserCheck, UserX, ChevronDown, ChevronUp,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdminRole {
  id:          number
  name:        string
  description: string | null
  permissions: string[]
}

interface AdminUserDetail {
  id:            number
  email:         string
  full_name:     string
  is_active:     boolean
  is_superadmin: boolean
  last_login_at: string | null
  created_at:    string
  roles:         AdminRole[]
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const INPUT = 'w-full rounded-lg border border-tfa-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tfa-navy'
const LABEL = 'text-xs font-semibold text-tfa-gray-500 uppercase tracking-wide mb-1 block'

// ── Create User Modal ─────────────────────────────────────────────────────────
function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    email: '', full_name: '', password: '', confirm: '', is_superadmin: false,
  })
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: () => adminApi.createAdminUser({
      email:        form.email,
      full_name:    form.full_name,
      password:     form.password,
      is_superadmin: form.is_superadmin,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onClose() },
    onError:   (err: any) => setError(err?.response?.data?.detail ?? 'Failed to create user'),
  })

  const submit = () => {
    if (!form.email.trim())     return setError('Email is required')
    if (!form.full_name.trim()) return setError('Full name is required')
    if (form.password.length < 8) return setError('Password must be at least 8 characters')
    if (form.password !== form.confirm) return setError('Passwords do not match')
    setError('')
    mut.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded border border-tfa-gray-200 shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-tfa-gray-800">New Admin User</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-tfa-gray-100 text-tfa-gray-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className={LABEL}>Full Name <span className="text-red-400">*</span></label>
            <input className={INPUT} value={form.full_name} placeholder="e.g. Ahmad Al-Zahrani"
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div>
            <label className={LABEL}>Email Address <span className="text-red-400">*</span></label>
            <input className={INPUT} type="email" value={form.email} placeholder="user@fa.gov.sa"
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className={LABEL}>Password <span className="text-red-400">*</span></label>
            <input className={INPUT} type="password" value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div>
            <label className={LABEL}>Confirm Password <span className="text-red-400">*</span></label>
            <input className={INPUT} type="password" value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} />
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1">
            <input type="checkbox" checked={form.is_superadmin}
              onChange={(e) => setForm((f) => ({ ...f, is_superadmin: e.target.checked }))}
              className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy mt-0.5" />
            <div>
              <p className="text-sm font-medium text-tfa-gray-700">Superadmin</p>
              <p className="text-xs text-tfa-gray-400">Full access to all features — bypasses all permission checks</p>
            </div>
          </label>
        </div>

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        <div className="flex gap-2 pt-4">
          <Button onClick={submit} loading={mut.isPending} className="flex-1">Create User</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ── Reset Password Modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }: { user: AdminUserDetail; onClose: () => void }) {
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const mut = useMutation({
    mutationFn: () => adminApi.resetAdminPassword(user.id, pw),
    onSuccess: () => setDone(true),
    onError:   (err: any) => setError(err?.response?.data?.detail ?? 'Failed'),
  })

  const submit = () => {
    if (pw.length < 8) return setError('Min 8 characters')
    if (pw !== confirm) return setError('Passwords do not match')
    setError('')
    mut.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded border border-tfa-gray-200 shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-tfa-gray-800">Reset Password</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-tfa-gray-100 text-tfa-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-tfa-gray-500 mb-4">
          Setting a new password for <strong>{user.full_name}</strong> will immediately revoke all their active sessions.
        </p>

        {done ? (
          <div className="text-center py-4">
            <p className="text-green-600 font-semibold">Password updated.</p>
            <p className="text-xs text-tfa-gray-400 mt-1">All sessions for this user have been revoked.</p>
            <Button className="mt-4" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className={LABEL}>New Password</label>
                <input className={INPUT} type="password" value={pw}
                  onChange={(e) => setPw(e.target.value)} />
              </div>
              <div>
                <label className={LABEL}>Confirm Password</label>
                <input className={INPUT} type="password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} />
              </div>
            </div>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            <div className="flex gap-2 pt-4">
              <Button onClick={submit} loading={mut.isPending} className="flex-1">Set Password</Button>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── User Row ──────────────────────────────────────────────────────────────────
function UserRow({
  user, allRoles, currentUserId,
}: { user: AdminUserDetail; allRoles: AdminRole[]; currentUserId: number }) {
  const [expanded, setExpanded] = useState(false)
  const [resetting, setResetting] = useState(false)
  const qc = useQueryClient()

  const updateMut = useMutation({
    mutationFn: (data: object) => adminApi.updateAdminUser(user.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const assignMut = useMutation({
    mutationFn: (roleId: number) => adminApi.assignRole(user.id, roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const removeMut = useMutation({
    mutationFn: (roleId: number) => adminApi.removeRole(user.id, roleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const isSelf = user.id === currentUserId
  const assignedRoleIds = new Set(user.roles.map((r) => r.id))

  return (
    <>
      {resetting && <ResetPasswordModal user={user} onClose={() => setResetting(false)} />}

      <Card>
        <CardBody className="space-y-0 p-0">
          {/* Main row */}
          <div className="flex items-center gap-4 p-4">
            {/* Avatar */}
            <div className="h-9 w-9 rounded-full bg-tfa-navy/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-tfa-navy">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-tfa-gray-900">{user.full_name}</p>
                {user.is_superadmin && (
                  <Badge variant="info">Superadmin</Badge>
                )}
                <Badge variant={user.is_active ? 'success' : 'default'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {isSelf && (
                  <span className="text-xs text-tfa-gray-400 italic">You</span>
                )}
              </div>
              <p className="text-sm text-tfa-gray-500 truncate">{user.email}</p>
              {user.roles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {user.roles.map((r) => (
                    <span key={r.id} className="text-xs bg-tfa-gray-100 text-tfa-gray-600 px-2 py-0.5 rounded">
                      {r.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Toggle active */}
              <button
                title={user.is_active ? 'Deactivate user' : 'Activate user'}
                disabled={isSelf || updateMut.isPending}
                onClick={() => updateMut.mutate({ is_active: !user.is_active })}
                className="p-1.5 rounded hover:bg-tfa-gray-100 text-tfa-gray-400 hover:text-tfa-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {user.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
              </button>

              {/* Toggle superadmin */}
              <button
                title={user.is_superadmin ? 'Remove superadmin' : 'Make superadmin'}
                disabled={isSelf || updateMut.isPending}
                onClick={() => updateMut.mutate({ is_superadmin: !user.is_superadmin })}
                className="p-1.5 rounded hover:bg-tfa-gray-100 text-tfa-gray-400 hover:text-tfa-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {user.is_superadmin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              </button>

              {/* Reset password */}
              <button
                title="Reset password"
                onClick={() => setResetting(true)}
                className="p-1.5 rounded hover:bg-tfa-gray-100 text-tfa-gray-400 hover:text-tfa-gray-700"
              >
                <KeyRound className="h-4 w-4" />
              </button>

              {/* Expand roles */}
              <button
                onClick={() => setExpanded((v) => !v)}
                className="p-1.5 rounded hover:bg-tfa-gray-100 text-tfa-gray-400 hover:text-tfa-gray-700"
                title="Manage roles"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Expanded role editor */}
          {expanded && (
            <div className="border-t border-tfa-gray-100 px-4 py-3 bg-tfa-gray-50">
              <p className="text-xs font-semibold text-tfa-gray-400 uppercase tracking-wide mb-3">
                Permission Roles
              </p>
              {user.is_superadmin && (
                <p className="text-xs text-tfa-gray-400 mb-3 italic">
                  Superadmin bypasses all permission checks — role assignments are optional.
                </p>
              )}
              <div className="space-y-2">
                {allRoles.map((role) => {
                  const assigned = assignedRoleIds.has(role.id)
                  const busy = assignMut.isPending || removeMut.isPending
                  return (
                    <label key={role.id} className="flex items-start gap-3 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={assigned}
                        disabled={busy}
                        onChange={() =>
                          assigned
                            ? removeMut.mutate(role.id)
                            : assignMut.mutate(role.id)
                        }
                        className="h-4 w-4 rounded border-tfa-gray-300 text-tfa-navy mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-tfa-gray-700 group-hover:text-tfa-gray-900">
                          {role.name}
                        </p>
                        {role.description && (
                          <p className="text-xs text-tfa-gray-400">{role.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {role.permissions.map((p) => (
                            <span key={p} className="text-xs font-mono bg-tfa-navy/10 text-tfa-navy px-1.5 py-0.5 rounded">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
              {/* Last login */}
              <p className="text-xs text-tfa-gray-400 mt-3 pt-3 border-t border-tfa-gray-200">
                Last login: {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                &nbsp;·&nbsp; Created: {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function AdminUsers() {
  const [showCreate, setShowCreate] = useState(false)
  const { admin } = useAuthStore()

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listAdminUsers(),
  })

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => adminApi.listRoles(),
  })

  if (usersLoading || rolesLoading) return <PageSpinner />

  const users: AdminUserDetail[] = usersData?.data ?? []
  const roles: AdminRole[]       = rolesData?.data ?? []

  const active   = users.filter((u) => u.is_active)
  const inactive = users.filter((u) => !u.is_active)

  return (
    <div className="space-y-6">
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-tfa-gray-800">Admin Users</h1>
          <p className="text-sm text-tfa-gray-500 mt-1">
            {users.length} users · {active.length} active
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> New User
        </Button>
      </div>

      {/* Active users */}
      <div className="space-y-3">
        {active.map((u) => (
          <UserRow key={u.id} user={u} allRoles={roles} currentUserId={admin?.id ?? 0} />
        ))}
      </div>

      {/* Inactive users */}
      {inactive.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-tfa-gray-400 uppercase tracking-wide mb-3">Inactive</p>
          <div className="space-y-3">
            {inactive.map((u) => (
              <UserRow key={u.id} user={u} allRoles={roles} currentUserId={admin?.id ?? 0} />
            ))}
          </div>
        </div>
      )}

      {users.length === 0 && (
        <div className="text-center py-12 text-tfa-gray-400">
          No admin users found.
        </div>
      )}
    </div>
  )
}
