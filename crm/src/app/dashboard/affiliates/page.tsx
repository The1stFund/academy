'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHandshake, faWallet, faArrowDown, faUsers, faChartLine } from '@fortawesome/free-solid-svg-icons'

type Affiliate = {
  id: string
  user_id: string
  referral_code: string
  commission_percent: number
  role: string
  is_active: boolean
  created_at: string
  user_email: string
  balance: number
  pending_balance: number
  total_earned: number
  total_withdrawn: number
}

type Payout = {
  id: string
  affiliate_id: string
  amount: number
  currency: string
  status: string
  notes: string
  processed_at: string
  created_at: string
  affiliate_email: string
}

const ROLE_LABELS: Record<string, string> = {
  standard: 'Afiliant',
  promoter: 'Promotor',
  coordinator: 'Koordynator',
}

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'affiliates' | 'payouts'>('affiliates')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [payoutAmounts, setPayoutAmounts] = useState<Record<string, string>>({})
  const [payoutNotes, setPayoutNotes] = useState<Record<string, string>>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: affsData } = await supabase.rpc('get_affiliates_with_wallets')
    if (affsData) setAffiliates(affsData as Affiliate[])

    const { data: payoutsData } = await supabase.rpc('get_payouts')
    if (payoutsData) setPayouts(payoutsData as Payout[])

    setLoading(false)
  }

  async function handlePayout(affiliate: Affiliate) {
    const amount = parseFloat(payoutAmounts[affiliate.id] || '0')
    if (!amount || amount <= 0) { alert('Podaj kwotę wypłaty'); return }
    if (amount > affiliate.balance) { alert('Kwota przekracza dostępne saldo'); return }

    setProcessingId(affiliate.id)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data: adminUser } = await supabase.schema('core').from('users').select('id').eq('auth_user_id', session.user.id).single()

    const { error } = await supabase.rpc('process_payout', {
      p_affiliate_id: affiliate.id,
      p_amount: amount,
      p_notes: payoutNotes[affiliate.id] || '',
      p_processed_by: adminUser?.id || session.user.id,
    })

    if (error) {
      alert('Błąd przy procesowaniu wypłaty: ' + error.message)
    } else {
      setPayoutAmounts(prev => ({ ...prev, [affiliate.id]: '' }))
      setPayoutNotes(prev => ({ ...prev, [affiliate.id]: '' }))
      await loadData()
    }
    setProcessingId(null)
  }

  const totalPendingBalance = affiliates.reduce((sum, a) => sum + (a.balance || 0), 0)
  const totalEarned = affiliates.reduce((sum, a) => sum + (a.total_earned || 0), 0)

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#16db65', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="px-6 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#111' }}>Program afiliacyjny</h1>
        <p className="text-sm" style={{ color: '#888' }}>Zarządzaj afiliantami, prowizjami i wypłatami</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Aktywni afilianci', value: affiliates.filter(a => a.is_active).length, icon: faUsers },
          { label: 'Do wypłaty (łącznie)', value: `$${totalPendingBalance.toFixed(2)}`, icon: faWallet },
          { label: 'Łącznie zarobione', value: `$${totalEarned.toFixed(2)}`, icon: faChartLine },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#f0f0f0' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium" style={{ color: '#888' }}>{stat.label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                <FontAwesomeIcon icon={stat.icon} style={{ color: '#16db65', fontSize: '14px' }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#111' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {(['affiliates', 'payouts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: activeTab === tab ? 'white' : 'transparent',
              color: activeTab === tab ? '#111' : '#888',
              boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab === 'affiliates' ? 'Afilianci' : 'Historia wypłat'}
          </button>
        ))}
      </div>

      {/* Affiliates tab */}
      {activeTab === 'affiliates' && (
        <div className="space-y-4">
          {affiliates.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border" style={{ borderColor: '#f0f0f0' }}>
              <FontAwesomeIcon icon={faHandshake} style={{ color: '#ddd', fontSize: '32px' }} />
              <p className="mt-4 text-sm" style={{ color: '#888' }}>Brak afiliantów</p>
            </div>
          ) : affiliates.map(aff => (
            <div key={aff.id} className="bg-white rounded-2xl border p-5" style={{ borderColor: '#f0f0f0' }}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: '#f0fdf4', color: '#16db65' }}>
                    {(aff.user_email || 'A')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#111' }}>{aff.user_email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#f0fdf4', color: '#16db65' }}>
                        {ROLE_LABELS[aff.role] || aff.role}
                      </span>
                      <span className="text-xs font-mono" style={{ color: '#888' }}>{aff.referral_code}</span>
                      <span className="text-xs font-medium" style={{ color: '#888' }}>{aff.commission_percent}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="text-right">
                    <p className="text-xs" style={{ color: '#888' }}>Saldo</p>
                    <p className="text-lg font-bold" style={{ color: '#111' }}>${(aff.balance || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: '#888' }}>Łącznie</p>
                    <p className="text-sm font-semibold" style={{ color: '#555' }}>${(aff.total_earned || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: '#888' }}>Wypłacono</p>
                    <p className="text-sm font-semibold" style={{ color: '#555' }}>${(aff.total_withdrawn || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {(aff.balance || 0) > 0 && (
                <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-3" style={{ borderColor: '#f5f5f5' }}>
                  <input
                    type="number"
                    placeholder={`Kwota (max $${(aff.balance || 0).toFixed(2)})`}
                    value={payoutAmounts[aff.id] || ''}
                    onChange={e => setPayoutAmounts(prev => ({ ...prev, [aff.id]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: '#e5e5e5' }}
                  />
                  <input
                    type="text"
                    placeholder="Notatka (opcjonalnie)"
                    value={payoutNotes[aff.id] || ''}
                    onChange={e => setPayoutNotes(prev => ({ ...prev, [aff.id]: e.target.value }))}
                    className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: '#e5e5e5' }}
                  />
                  <button
                    onClick={() => handlePayout(aff)}
                    disabled={processingId === aff.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-opacity hover:opacity-90 flex-shrink-0"
                    style={{ background: '#16db65', opacity: processingId === aff.id ? 0.7 : 1 }}
                  >
                    <FontAwesomeIcon icon={faArrowDown} style={{ fontSize: '12px' }} />
                    {processingId === aff.id ? 'Procesowanie...' : 'Wypłać'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payouts tab */}
      {activeTab === 'payouts' && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#f0f0f0' }}>
          {payouts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm" style={{ color: '#888' }}>Brak historii wypłat</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  {['Afiliant', 'Kwota', 'Status', 'Notatka', 'Data'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold" style={{ color: '#888' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payouts.map(payout => (
                  <tr key={payout.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td className="px-5 py-3 text-sm font-medium" style={{ color: '#111' }}>{payout.affiliate_email}</td>
                    <td className="px-5 py-3 text-sm font-bold" style={{ color: '#16db65' }}>${Number(payout.amount).toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: '#f0fdf4', color: '#16db65' }}>
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm" style={{ color: '#888' }}>{payout.notes || '—'}</td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#888' }}>
                      {new Date(payout.created_at).toLocaleDateString('pl-PL')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
