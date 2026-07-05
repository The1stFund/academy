'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGraduationCap, faChartLine, faTrophy, faHandshake, faUser, faComments, faArrowRightFromBracket, faChevronRight, faLock } from '@fortawesome/free-solid-svg-icons'

type UserData = { id: string; email: string; role: string; full_name?: string }
type Subscription = { status: string; current_period_end: string }

export default function StudentDashboard() {
  const [user, setUser] = useState<UserData | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadUserData() }, [])

  async function loadUserData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: coreUser } = await supabase.schema('core').from('users').select('id, email, role').eq('auth_user_id', session.user.id).single()
    if (coreUser) {
      const { data: profile } = await supabase.schema('core').from('profiles').select('full_name').eq('user_id', coreUser.id).single()
      setUser({ ...coreUser, full_name: profile?.full_name })
      const { data: sub } = await supabase.schema('payments').from('subscriptions').select('status, current_period_end').eq('user_id', coreUser.id).in('status', ['active', 'frozen']).order('created_at', { ascending: false }).limit(1).single()
      if (sub) setSubscription(sub)
    }
    setLoading(false)
  }

  async function handleBuySubscription(plan: 'monthly' | 'annual') {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const priceId = plan === 'annual' ? 'price_1TpTuR0tKvZv0CxQuvBZQS9a' : 'price_1TpTuR0tKvZv0CxQbKsGZK9m'
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, userId: session.user.id }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else alert('Błąd tworzenia sesji płatności. Spróbuj ponownie.')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function formatDate(d: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pl-PL')
  }

  const navItems = [
    { icon: faGraduationCap, label: 'Kursy', href: '/courses', locked: false },
    { icon: faChartLine, label: 'Analizy rynku', href: '/analysis', locked: !subscription || subscription?.status === 'frozen' },
    { icon: faTrophy, label: 'Leaderboard', href: '/leaderboard', locked: !subscription || subscription?.status === 'frozen' },
    { icon: faHandshake, label: 'Program afiliacyjny', href: '/affiliate', locked: false },
    { icon: faUser, label: 'Profil', href: '/profile', locked: false },
    { icon: faComments, label: 'Discord', href: 'https://discord.gg/', locked: !subscription, external: true },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#16db65', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>

      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0" style={{ background: '#111' }}>
        <div className="px-6 py-6 border-b" style={{ borderColor: '#222' }}>
          <Link href="/" className="flex items-center gap-3">
            <img src="/the1stacademy_Logo_sygnet_white.svg" alt="Logo" style={{ width: '32px', height: '32px' }} />
            <span className="text-white font-bold text-sm tracking-tight">THE 1ST <span style={{ color: '#16db65' }}>ACADEMY</span></span>
          </Link>
        </div>

        <div className="px-4 py-4 border-b" style={{ borderColor: '#222' }}>
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: '#16db65', color: '#111' }}>
              {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'Student'}</p>
              <p className="text-xs truncate" style={{ color: '#666' }}>{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.label}
              href={item.locked ? '#' : item.href}
              target={item.external ? '_blank' : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group"
              style={{ color: item.locked ? '#444' : '#aaa' }}
              onClick={item.locked ? (e) => e.preventDefault() : undefined}
            >
              <FontAwesomeIcon icon={item.locked ? faLock : item.icon} style={{ fontSize: '14px', width: '16px', color: item.locked ? '#444' : '#666' }} />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {!item.locked && <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '10px', color: '#444' }} />}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t" style={{ borderColor: '#222' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full transition-colors hover:bg-white/5"
            style={{ color: '#666' }}
          >
            <FontAwesomeIcon icon={faArrowRightFromBracket} style={{ fontSize: '14px', width: '16px' }} />
            <span className="text-sm font-medium">Wyloguj się</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 overflow-auto">
        <div className="px-8 py-8 max-w-5xl">

          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#111' }}>
              Witaj{user?.full_name ? `, ${user.full_name}` : ''}! 👋
            </h1>
            <p className="text-sm" style={{ color: '#888' }}>
              {subscription?.status === 'frozen' ? '⚠️ Subskrypcja zamrożona — skontaktuj się z supportem' : subscription ? `Subskrypcja aktywna do ${formatDate(subscription.current_period_end)}` : 'Brak aktywnej subskrypcji'}
            </p>
          </div>

          {!subscription && (
            <div className="rounded-2xl p-5 mb-8 flex items-center justify-between" style={{ background: '#fff8e6', border: '1px solid #fde68a' }}>
              <div>
                <p className="font-bold text-sm mb-1" style={{ color: '#92400e' }}>Odblokuj pełny dostęp</p>
                <p className="text-xs" style={{ color: '#b45309' }}>Kup subskrypcję żeby uzyskać dostęp do wszystkich kursów i analiz</p>
              </div>
              <div className="flex gap-2 flex-shrink-0 ml-4">
                <button onClick={() => handleBuySubscription('monthly')} className="px-4 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#16db65' }}>
                  Miesięczny – $100/msc
                </button>
                <button onClick={() => handleBuySubscription('annual')} className="px-4 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#111' }}>
                  Roczny – $899/rok
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {navItems.filter(i => !i.external).map(item => (
              <Link
                key={item.label}
                href={item.locked ? '#' : item.href}
                onClick={item.locked ? (e) => e.preventDefault() : undefined}
                className="bg-white rounded-2xl p-6 border transition-all hover:border-gray-200 hover:shadow-sm"
                style={{ borderColor: '#f0f0f0', opacity: item.locked ? 0.5 : 1, cursor: item.locked ? 'not-allowed' : 'pointer' }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: item.locked ? '#f5f5f5' : '#f0fdf4' }}>
                  <FontAwesomeIcon icon={item.locked ? faLock : item.icon} style={{ color: item.locked ? '#aaa' : '#16db65', fontSize: '16px' }} />
                </div>
                <h3 className="font-bold text-sm mb-1" style={{ color: '#111' }}>{item.label}</h3>
                <p className="text-xs" style={{ color: '#aaa' }}>
                  {item.locked ? 'Wymaga subskrypcji' : 'Kliknij aby przejść →'}
                </p>
              </Link>
            ))}
          </div>

        </div>
      </main>
    </div>
  )
}
