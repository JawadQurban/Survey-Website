import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { adminApi } from '@/lib/api'
import { useLanguageStore } from '@/store/languageStore'
import { t } from '@/lib/i18n'
import {
  LayoutDashboard,
  Building2,
  Users,
  ClipboardList,
  FileText,
  Layers,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  { to: '/admin/dashboard', label: 'admin.nav.dashboard', icon: LayoutDashboard },
  { to: '/admin/organizations', label: 'admin.nav.organizations', icon: Building2 },
  { to: '/admin/contacts', label: 'admin.nav.contacts', icon: Users },
  { to: '/admin/surveys', label: 'admin.nav.surveys', icon: ClipboardList },
  { to: '/admin/submissions', label: 'admin.nav.submissions', icon: FileText },
  { to: '/admin/cms', label: 'admin.nav.cms', icon: Layers },
  { to: '/admin/settings', label: 'admin.nav.settings', icon: Settings },
]

export function AdminLayout() {
  const { admin, setAdmin } = useAuthStore()
  const { language } = useLanguageStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await adminApi.logout()
    setAdmin(null)
    navigate('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-tfa-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-tfa-navy text-white flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <img src="/logo.svg" alt="TFA" className="h-8 w-auto brightness-0 invert" />
          <p className="text-xs text-white/60 mt-1">Survey Platform</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t(label, language)}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 py-2 text-xs text-white/50 mb-2">{admin?.email}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {t('admin.nav.logout', language)}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
