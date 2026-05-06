import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { adminApi } from '@/lib/api'
import { useLanguageStore } from '@/store/languageStore'
import { t } from '@/lib/i18n'
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Layers,
  Settings,
  LogOut,
  BookOpen,
  Users,
  UserCog,
  Link2,
} from 'lucide-react'

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <NavLink to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors ${
          isActive ? 'bg-white/15 text-white font-medium' : 'text-white/65 hover:bg-white/8 hover:text-white/90'
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <>
      <div className="border-t border-white/10 my-2" />
      <p className="px-3 py-1 text-xs text-white/30 uppercase tracking-widest">{label}</p>
    </>
  )
}

export function AdminLayout() {
  const { admin, setAdmin, can, canStandard } = useAuthStore()
  const { language } = useLanguageStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const handleLogout = async () => {
    try { await adminApi.logout() } catch { /* ignore */ }
    finally {
      setAdmin(null)
      qc.clear()
      navigate('/admin/login', { replace: true })
    }
  }

  const showStandard  = canStandard()
  const showGroupReg  = admin?.is_superadmin || can('surveys.group_registration.manage')

  return (
    <div className="flex min-h-screen bg-tfa-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-tfa-navy text-white flex flex-col shrink-0">
        <div className="px-4 py-4 border-b border-white/10">
          <img src="/logo.png" alt="TFA" className="h-7 w-auto" />
          <p className="text-xs text-white/50 mt-1.5 font-medium tracking-wide uppercase">Survey Platform</p>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {/* Dashboard — always visible */}
          <NavItem to="/admin/dashboard" icon={LayoutDashboard} label={t('admin.nav.dashboard', language)} />

          {/* Standard survey section */}
          {showStandard && (
            <>
              <NavItem to="/admin/surveys"     icon={ClipboardList} label={t('admin.nav.surveys', language)} />
              <NavItem to="/admin/submissions" icon={FileText}      label={t('admin.nav.submissions', language)} />
              <NavItem to="/admin/cms"         icon={Layers}        label={t('admin.nav.cms', language)} />
              <NavItem to="/admin/settings"    icon={Settings}      label={t('admin.nav.settings', language)} />
            </>
          )}

          {/* Admin Users — superadmin only */}
          {admin?.is_superadmin && (
            <>
              <SectionDivider label="System" />
              <NavItem to="/admin/users" icon={UserCog} label="Admin Users" />
            </>
          )}

          {/* Group Registration section */}
          {showGroupReg && (
            <>
              <SectionDivider label="Group Registration" />
              <NavItem to="/admin/group-registration-forms" icon={Link2}     label="Registration Forms" />
              <NavItem to="/admin/group-registration"       icon={Users}     label={t('admin.nav.group_registration', language)} />
              <NavItem to="/admin/training-courses"         icon={BookOpen}  label={t('admin.nav.training_courses', language)} />
            </>
          )}
        </nav>

        <div className="px-2 py-3 border-t border-white/10">
          <p className="px-3 py-1 text-xs text-white/40 truncate mb-1">{admin?.email}</p>
          <button onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded text-sm text-white/60 hover:bg-white/8 hover:text-white/90 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {t('admin.nav.logout', language)}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
