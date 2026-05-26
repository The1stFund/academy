'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGraduationCap, faChartLine, faTrophy, faHandshake, faUser, faArrowRightFromBracket, faChevronRight, faEnvelope, faCalendar, faCrown, faEdit, faCheck } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'

type UserData = { id: string; email: string; role: string; full_name?: string; created_at?: string }
type Subscription = { status: string; current_period_end: string; plan_id: string }

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: coreUser } = await supabase.schema('core').from('users').select('id, email, role, created_at').eq('auth_user_id', session.user.id).single()
    if (coreUser) {
      const { data: profile } = await supabase.schema('core').from('profiles').select('full_name').eq('user_id', coreUser.id).single()
      const userData = { ...coreUser, full_name: profile?.full_name }
      setUser(userData)
      setFullName(profile?.full_name || '')
      const { data: sub } = await supabase.schema('payments').from('subscriptions').select('status, current_period_end, plan_id').eq('user_id', coreUser.id).eq('status', 'active').single()
      if (sub) setSubscription(sub)
    }
    setLoading(false)
  }

  async function saveName() {
    if (!user) return
    setSaving(true)
    await supabase.schema('core').from('profiles').upsert({ user_id: user.id, full_name: fullName }, { onConflict: 'user_id' })
    setUser({ ...user, full_name: fullName })
    setSaving(false)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push('/') }

  function formatDate(d: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const navItems = [
    { icon: faGraduationCap, label: 'Kursy', href: '/courses' },
    { icon: faChartLine, label: 'Analizy rynku', href: '/analysis' },
    { icon: faTrophy, label: 'Leaderboard', href: '/leaderboard' },
    { icon: faHandshake, label: 'Program afiliacyjny', href: '/affiliate' },
    { icon: faUser, label: 'Profil', href: '/profile', active: true },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#16db65', borderTopColor: 'transparent' }} />
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
            <Link key={item.label} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
              style={{ background: (item as any).active ? 'rgba(22,219,101,0.1)' : 'transparent', color: (item as any).active ? '#16db65' : '#aaa' }}
            >
              <FontAwesomeIcon icon={item.icon} style={{ fontSize: '14px', width: '16px' }} />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '10px', color: '#444' }} />
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t" style={{ borderColor: '#222' }}>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full hover:bg-white/5" style={{ color: '#666' }}>
            <FontAwesomeIcon icon={faArrowRightFromBracket} style={{ fontSize: '14px', width: '16px' }} />
            <span className="text-sm font-medium">Wyloguj się</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 overflow-auto">
        <div className="px-8 py-8 max-w-2xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#111' }}>Profil</h1>
            <p className="text-sm" style={{ color: '#888' }}>Zarządzaj swoim kontem i subskrypcją</p>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#f0f0f0' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-sm" style={{ color: '#111' }}>Dane osobowe</h2>
                {!editing && (
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50" style={{ color: '#888', borderColor: '#e5e7eb' }}>
                    <FontAwesomeIcon icon={faEdit} style={{ fontSize: '11px' }} />
                    Edytuj
                  </button>
                )}
                {saved && (
                  <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#16db65' }}>
                    <FontAwesomeIcon icon={faCheck} style={{ fontSize: '11px' }} />
                    Zapisano
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0" style={{ background: '#f0fdf4', color: '#16db65' }}>
                  {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold" style={{ color: '#111' }}>{user?.full_name || 'Brak nazwy'}</p>
                  <p className="text-sm" style={{ color: '#888' }}>{user?.email}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block" style={{ background: '#f0fdf4', color: '#16db65' }}>{user?.role}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>IMIĘ I NAZWISKO</label>
                  {editing ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none"
                        style={{ borderColor: '#16db65', fontFamily: 'var(--font-montserrat)' }}
                        placeholder="Wpisz imię i nazwisko"
                      />
                      <button onClick={saveName} disabled={saving} className="px-4 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#16db65' }}>
                        {saving ? '...' : 'Zapisz'}
                      </button>
                      <button onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-xl text-sm border" style={{ borderColor: '#e5e7eb', color: '#888' }}>
                        Anuluj
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm px-4 py-2.5 rounded-xl" style={{ background: '#f9f9f9', color: '#111' }}>{user?.full_name || '—'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>EMAIL</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#f9f9f9' }}>
                    <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: '13px', color: '#aaa' }} />
                    <p className="text-sm" style={{ color: '#111' }}>{user?.email}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>CZŁONEK OD</label>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#f9f9f9' }}>
                    <FontAwesomeIcon icon={faCalendar} style={{ fontSize: '13px', color: '#aaa' }} />
                    <p className="text-sm" style={{ color: '#111' }}>{formatDate(user?.created_at || '')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#f0f0f0' }}>
              <h2 className="font-bold text-sm mb-4" style={{ color: '#111' }}>Subskrypcja</h2>
              {subscription ? (
                <div>
                  <div className="flex items-center gap-3 p-4 rounded-xl mb-4" style={{ background: '#f0fdf4' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#16db65' }}>
                      <FontAwesomeIcon icon={faCrown} style={{ color: 'white', fontSize: '16px' }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#111' }}>The1st Academy</p>
                      <p className="text-xs" style={{ color: '#16db65' }}>Aktywna subskrypcja</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs" style={{ color: '#888' }}>Aktywna do</p>
                      <p className="text-sm font-bold" style={{ color: '#111' }}>{formatDate(subscription.current_period_end)}</p>
                    </div>
                  </div>
                  <p className="text-xs" style={{ color: '#aaa' }}>Aby anulować subskrypcję skontaktuj się z nami przez Discord lub email.</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm mb-4" style={{ color: '#888' }}>Nie masz aktywnej subskrypcji.</p>
                  <Link href="/pricing" className="inline-block px-5 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#16db65' }}>
                    Kup subskrypcję – £49/msc
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
