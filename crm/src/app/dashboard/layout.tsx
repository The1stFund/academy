'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faGauge, faUsers, faCreditCard, faBookOpen, faHandshake,
  faChartBar, faGear, faArrowRightFromBracket, faChevronRight,
  faListCheck
} from '@fortawesome/free-solid-svg-icons'

const allNavItems = [
  { icon: faGauge, label: 'Dashboard', href: '/dashboard', roles: ['super_admin', 'admin', 'trainer'] },
  { icon: faUsers, label: 'Użytkownicy', href: '/dashboard/users', roles: ['super_admin'] },
  { icon: faCreditCard, label: 'Subskrypcje', href: '/dashboard/subscriptions', roles: ['super_admin'] },
  { icon: faBookOpen, label: 'Treści', href: '/dashboard/content', roles: ['super_admin', 'admin', 'trainer'] },
  { icon: faListCheck, label: 'Plany', href: '/dashboard/plans', roles: ['super_admin'] },
  { icon: faHandshake, label: 'Afiliacja', href: '/dashboard/affiliates', roles: ['super_admin', 'admin'] },
  { icon: faChartBar, label: 'Raporty', href: '/dashboard/reports', roles: ['super_admin', 'admin'] },
  { icon: faGear, label: 'Ustawienia', href: '/dashboard/settings', roles: ['super_admin'] },
]


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ email: string; role: string } | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function checkAccess() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Verify admin/super_admin role
      const { data: coreUser } = await supabase
        .schema('core')
        .from('users')
        .select('role')
        .eq('auth_user_id', session.user.id)
        .single()

      if (!coreUser || !['admin', 'super_admin', 'trainer'].includes(coreUser.role)) {
        await supabase.auth.signOut()
        router.push('/login?error=unauthorized')
        return
      }

      setUser({ email: session.user.email || '', role: coreUser.role })
    }
    checkAccess()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = allNavItems.filter(item => item.roles.includes(user?.role || ''))

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0" style={{ background: '#111' }}>
        {/* Logo */}
        <div className="px-6 py-5 border-b" style={{ borderColor: '#1e1e1e' }}>
          <Link href="/dashboard" className="flex items-center gap-3">
            <img src="/the1stacademy_Logo_sygnet_white.svg" alt="Logo" style={{ width: '28px', height: '28px' }} />
            <span className="text-white font-bold text-sm tracking-tight">
              THE 1ST <span style={{ color: '#16db65' }}>ACADEMY</span>
            </span>
          </Link>
        </div>

        {/* User */}
        <div className="px-4 py-3 border-b" style={{ borderColor: '#1e1e1e' }}>
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: '#16db65', color: '#111' }}>
              {(user?.email || 'A')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.email || '...'}</p>
              <p className="text-xs" style={{ color: '#555' }}>Administrator</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                style={{
                  background: isActive ? 'rgba(22,219,101,0.1)' : 'transparent',
                  color: isActive ? '#16db65' : '#888',
                }}
              >
                <FontAwesomeIcon icon={item.icon} style={{ fontSize: '13px', width: '14px' }} />
                <span className="text-xs font-medium flex-1">{item.label}</span>
                {isActive && <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '9px' }} />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-3 border-t" style={{ borderColor: '#1e1e1e' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-colors hover:bg-white/5"
            style={{ color: '#555' }}
          >
            <FontAwesomeIcon icon={faArrowRightFromBracket} style={{ fontSize: '13px', width: '14px' }} />
            <span className="text-xs font-medium">Wyloguj się</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        {children}
      </main>
    </div>
  )
}
