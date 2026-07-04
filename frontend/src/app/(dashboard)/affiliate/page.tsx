'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGraduationCap, faChartLine, faTrophy, faHandshake, faUser, faArrowRightFromBracket, faChevronRight, faCopy, faCheck, faCoins, faUsers, faLink, faWallet } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'

type Affiliate = { id: string; referral_code: string; commission_percent: number; role: string; is_active: boolean }
type Commission = { id: string; amount: number; status: string; created_at: string }
type Wallet = { balance: number; total_earned: number; pending_withdrawal: number }

export default function AffiliatePage() {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [referralCount, setReferralCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [user, setUser] = useState<{ email: string; full_name?: string } | null>(null)
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
      const { data: affData } = await supabase.rpc('get_affiliate_data', { p_user_id: coreUser.id })
      if (affData) {
        if (affData.affiliate) setAffiliate(affData.affiliate)
        if (affData.wallet) setWallet(affData.wallet)
        if (affData.commissions) setCommissions(affData.commissions)
        setReferralCount(affData.referral_count || 0)
      }
    }
    setLoading(false)
  }

  async function createAffiliate() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data: coreUser } = await supabase.schema('core').from('users').select('id').eq('auth_user_id', session.user.id).single()
    if (!coreUser) return
    const code = 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data: affId, error } = await supabase.rpc('create_affiliate', { p_user_id: coreUser.id, p_referral_code: code })
    if (!error && affId) {
      const { data: affData } = await supabase.rpc('get_affiliate_data', { p_user_id: coreUser.id })
      if (affData?.affiliate) setAffiliate(affData.affiliate)
    }
  }

  function copyLink() {
    if (!affiliate) return
    navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL}/checkout?ref=${affiliate.referral_code}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push('/') }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const navItems = [
    { icon: faGraduationCap, label: 'Kursy', href: '/courses' },
    { icon: faChartLine, label: 'Analizy rynku', href: '/analysis' },
    { icon: faTrophy, label: 'Leaderboard', href: '/leaderboard' },
    { icon: faHandshake, label: 'Program afiliacyjny', href: '/affiliate', active: true },
    { icon: faUser, label: 'Profil', href: '/profile' },
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
        <div className="px-8 py-8 max-w-3xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#111' }}>Program afiliacyjny</h1>
            <p className="text-sm" style={{ color: '#888' }}>Zarabiaj polecając The1st Academy</p>
          </div>

          {!affiliate ? (
            <div className="bg-white rounded-2xl p-8 border text-center" style={{ borderColor: '#f0f0f0' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#f0fdf4' }}>
                <FontAwesomeIcon icon={faHandshake} style={{ color: '#16db65', fontSize: '28px' }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: '#111' }}>Dołącz do programu afiliacyjnego</h2>
              <p className="text-sm mb-6" style={{ color: '#888' }}>Zarabiaj 25% prowizji od każdej subskrypcji którą polecisz. Wypłaty co miesiąc.</p>
              <button onClick={createAffiliate} className="px-6 py-3 rounded-xl font-bold text-sm text-white" style={{ background: '#16db65' }}>
                Aktywuj program afiliacyjny
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: faWallet, label: 'Saldo', value: `$${(wallet?.balance || 0).toFixed(2)}`, color: '#16db65' },
                  { icon: faCoins, label: 'Łącznie zarobione', value: `$${(wallet?.total_earned || 0).toFixed(2)}`, color: '#111' },
                  { icon: faUsers, label: 'Poleceni', value: referralCount.toString(), color: '#111' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#f0f0f0' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: '#f0fdf4' }}>
                      <FontAwesomeIcon icon={stat.icon} style={{ color: '#16db65', fontSize: '15px' }} />
                    </div>
                    <p className="text-xs font-medium mb-1" style={{ color: '#888' }}>{stat.label}</p>
                    <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#f0f0f0' }}>
                <h2 className="font-bold text-sm mb-4" style={{ color: '#111' }}>Twój link polecający</h2>
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: '#f9f9f9' }}>
                  <FontAwesomeIcon icon={faLink} style={{ color: '#aaa', fontSize: '14px', flexShrink: 0 }} />
                  <span className="text-sm flex-1 font-mono truncate" style={{ color: '#555' }}>
                    {process.env.NEXT_PUBLIC_APP_URL}/checkout?ref={affiliate.referral_code}
                  </span>
                  <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all flex-shrink-0" style={{ background: copied ? '#f0fdf4' : '#111', color: copied ? '#16db65' : 'white' }}>
                    <FontAwesomeIcon icon={copied ? faCheck : faCopy} style={{ fontSize: '11px' }} />
                    {copied ? 'Skopiowano!' : 'Kopiuj'}
                  </button>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <div className="text-center px-4 py-2 rounded-xl" style={{ background: '#f0fdf4' }}>
                    <p className="text-xs" style={{ color: '#888' }}>Twoja prowizja</p>
                    <p className="text-lg font-bold" style={{ color: '#16db65' }}>{affiliate.commission_percent}%</p>
                  </div>
                  <p className="text-xs" style={{ color: '#aaa' }}>
                    Za każdą subskrypcję miesięczną ($100) zarabiasz <strong style={{ color: '#111' }}>${(49 * affiliate.commission_percent / 100).toFixed(2)}</strong>. Za roczną ($1009) zarabiasz <strong style={{ color: '#111' }}>${(499 * affiliate.commission_percent / 100).toFixed(2)}</strong>.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#f0f0f0' }}>
                <h2 className="font-bold text-sm mb-4" style={{ color: '#111' }}>Historia prowizji</h2>
                {commissions.length === 0 ? (
                  <div className="text-center py-8">
                    <FontAwesomeIcon icon={faCoins} style={{ color: '#e5e7eb', fontSize: '32px', marginBottom: '12px' }} />
                    <p className="text-sm" style={{ color: '#aaa' }}>Brak prowizji – zacznij polecać!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {commissions.map(comm => (
                      <div key={comm.id} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: '#f5f5f5' }}>
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#111' }}>Prowizja</p>
                          <p className="text-xs" style={{ color: '#aaa' }}>{formatDate(comm.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: '#16db65' }}>+${comm.amount.toFixed(2)}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: comm.status === 'paid' ? '#f0fdf4' : '#f5f5f5', color: comm.status === 'paid' ? '#16db65' : '#888' }}>
                            {comm.status === 'paid' ? 'Wypłacono' : 'Oczekuje'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
