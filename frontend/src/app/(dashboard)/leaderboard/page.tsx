'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGraduationCap, faChartLine, faTrophy, faHandshake, faUser, faArrowRightFromBracket, faChevronRight, faLock, faMedal } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'

type Trader = { id: string; user_id: string; display_name: string; roi: number; win_rate: number; total_trades: number; profit: number; rank: number }

export default function LeaderboardPage() {
  const [traders, setTraders] = useState<Trader[]>([])
  const [hasSubscription, setHasSubscription] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ email: string; full_name?: string } | null>(null)
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'alltime'>('monthly')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: coreUser } = await supabase.schema('core').from('users').select('id, email').eq('auth_user_id', session.user.id).single()
    if (coreUser) {
      const { data: profile } = await supabase.schema('core').from('profiles').select('full_name').eq('user_id', coreUser.id).single()
      setUser({ email: coreUser.email, full_name: profile?.full_name })
      const { data: sub } = await supabase.schema('payments').from('subscriptions').select('status').eq('user_id', coreUser.id).eq('status', 'active').single()
      setHasSubscription(!!sub)
      if (sub) {
        const { data: leaderboardData } = await supabase.schema('trading').from('leaderboard').select('*').order('rank', { ascending: true }).limit(50)
        if (leaderboardData) setTraders(leaderboardData)
      }
    }
    setLoading(false)
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push('/') }

  const navItems = [
    { icon: faGraduationCap, label: 'Kursy', href: '/courses' },
    { icon: faChartLine, label: 'Analizy rynku', href: '/analysis' },
    { icon: faTrophy, label: 'Leaderboard', href: '/leaderboard', active: true },
    { icon: faHandshake, label: 'Program afiliacyjny', href: '/affiliate' },
    { icon: faUser, label: 'Profil', href: '/profile' },
  ]

  const mockTraders = [
    { rank: 1, name: 'T***r', roi: 142.3, winRate: 78, trades: 234 },
    { rank: 2, name: 'M***k', roi: 98.7, winRate: 71, trades: 189 },
    { rank: 3, name: 'A***a', roi: 87.2, winRate: 69, trades: 156 },
    { rank: 4, name: 'J***z', roi: 76.4, winRate: 65, trades: 201 },
    { rank: 5, name: 'P***i', roi: 65.1, winRate: 63, trades: 178 },
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
        {!hasSubscription ? (
          <div className="flex items-center justify-center min-h-full p-8">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: '#f0fdf4' }}>
                <FontAwesomeIcon icon={faTrophy} style={{ color: '#16db65', fontSize: '28px' }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: '#111' }}>Leaderboard traderów</h2>
              <p className="text-sm mb-6" style={{ color: '#888' }}>Ranking najlepszych traderów dostępny tylko dla subskrybentów.</p>
              <Link href="/pricing" className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-white" style={{ background: '#16db65' }}>
                Kup subskrypcję – £49/msc
              </Link>
            </div>
          </div>
        ) : (
          <div className="px-8 py-8 max-w-4xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-1" style={{ color: '#111' }}>Leaderboard</h1>
              <p className="text-sm" style={{ color: '#888' }}>Ranking najlepszych traderów platformy</p>
            </div>

            <div className="flex gap-2 mb-6">
              {(['weekly', 'monthly', 'alltime'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{ background: period === p ? '#16db65' : 'white', color: period === p ? 'white' : '#888', border: `1px solid ${period === p ? '#16db65' : '#e5e7eb'}` }}
                >
                  {p === 'weekly' ? 'Tygodniowy' : p === 'monthly' ? 'Miesięczny' : 'Wszech czasów'}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#f0f0f0' }}>
              <div className="grid grid-cols-12 px-6 py-3 border-b text-xs font-bold uppercase tracking-wider" style={{ borderColor: '#f5f5f5', color: '#aaa', background: '#fafafa' }}>
                <div className="col-span-1">#</div>
                <div className="col-span-5">Trader</div>
                <div className="col-span-2 text-right">ROI</div>
                <div className="col-span-2 text-right">Win rate</div>
                <div className="col-span-2 text-right">Transakcje</div>
              </div>

              {traders.length > 0 ? traders.map((trader, i) => (
                <div key={trader.id} className="grid grid-cols-12 px-6 py-4 border-b last:border-0 items-center transition-colors hover:bg-gray-50" style={{ borderColor: '#f5f5f5' }}>
                  <div className="col-span-1">
                    {i === 0 ? <FontAwesomeIcon icon={faMedal} style={{ color: '#FFD700', fontSize: '18px' }} /> :
                     i === 1 ? <FontAwesomeIcon icon={faMedal} style={{ color: '#C0C0C0', fontSize: '18px' }} /> :
                     i === 2 ? <FontAwesomeIcon icon={faMedal} style={{ color: '#CD7F32', fontSize: '18px' }} /> :
                     <span className="text-sm font-bold" style={{ color: '#aaa' }}>{trader.rank}</span>}
                  </div>
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: '#f0fdf4', color: '#16db65' }}>
                      {trader.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: '#111' }}>{trader.display_name || 'Trader'}</span>
                  </div>
                  <div className="col-span-2 text-right text-sm font-bold" style={{ color: trader.roi >= 0 ? '#16db65' : '#ef4444' }}>
                    {trader.roi >= 0 ? '+' : ''}{trader.roi?.toFixed(1)}%
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium" style={{ color: '#555' }}>
                    {trader.win_rate?.toFixed(0)}%
                  </div>
                  <div className="col-span-2 text-right text-sm" style={{ color: '#888' }}>
                    {trader.total_trades}
                  </div>
                </div>
              )) : mockTraders.map((trader, i) => (
                <div key={trader.rank} className="grid grid-cols-12 px-6 py-4 border-b last:border-0 items-center" style={{ borderColor: '#f5f5f5' }}>
                  <div className="col-span-1">
                    {i === 0 ? <FontAwesomeIcon icon={faMedal} style={{ color: '#FFD700', fontSize: '18px' }} /> :
                     i === 1 ? <FontAwesomeIcon icon={faMedal} style={{ color: '#C0C0C0', fontSize: '18px' }} /> :
                     i === 2 ? <FontAwesomeIcon icon={faMedal} style={{ color: '#CD7F32', fontSize: '18px' }} /> :
                     <span className="text-sm font-bold" style={{ color: '#aaa' }}>{trader.rank}</span>}
                  </div>
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: '#f0fdf4', color: '#16db65' }}>
                      {trader.name[0]}
                    </div>
                    <span className="text-sm font-semibold" style={{ color: '#111' }}>{trader.name}</span>
                  </div>
                  <div className="col-span-2 text-right text-sm font-bold" style={{ color: '#16db65' }}>+{trader.roi}%</div>
                  <div className="col-span-2 text-right text-sm font-medium" style={{ color: '#555' }}>{trader.winRate}%</div>
                  <div className="col-span-2 text-right text-sm" style={{ color: '#888' }}>{trader.trades}</div>
                </div>
              ))}
            </div>

            {traders.length === 0 && (
              <p className="text-center text-sm mt-4" style={{ color: '#aaa' }}>Dane rankingowe pojawią się gdy traderzy podłączą swoje konta MT4/MT5</p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
