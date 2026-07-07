'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBan, faSnowflake, faRotateRight, faCreditCard } from '@fortawesome/free-solid-svg-icons'

type Subscription = {
  id: string
  user_id: string
  stripe_subscription_id: string
  status: string
  current_period_start: string
  current_period_end: string
  is_free_via_coupon: boolean
  created_at: string
  user_email?: string
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: '#f0fdf4', color: '#16a34a', label: 'Aktywna' },
  inactive:  { bg: '#f5f5f5', color: '#888',    label: 'Nieaktywna' },
  cancelled: { bg: '#fef2f2', color: '#dc2626', label: 'Anulowana' },
  frozen:    { bg: '#eff6ff', color: '#2563eb', label: 'Zamrożona' },
  past_due:  { bg: '#fff7ed', color: '#ea580c', label: 'Zaległa' },
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string; email: string } | null>(null)
  const [reason, setReason] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    // Get subscriptions with user emails via RPC
    const { data } = await supabase.rpc('get_subscriptions_with_users')
    if (data) setSubscriptions(data as Subscription[])
    setLoading(false)
  }

  async function handleAction(stripeSubId: string, action: string) {
    setActionLoading(stripeSubId + action)
    const { error } = await supabase.rpc('manage_subscription', {
      p_stripe_subscription_id: stripeSubId,
      p_action: action,
      p_reason: reason || null,
    })
    if (error) {
      alert('Błąd: ' + error.message)
    } else {
      // If cancelling or freezing, remove Discord role
      if (confirmAction?.action !== 'reactivate') {
        const sub = subscriptions.find(s => s.stripe_subscription_id === stripeSubId)
        if (sub) {
          const { data: discordId } = await supabase.rpc('get_discord_id', { p_user_id: sub.user_id })
          if (discordId) {
            await fetch('/api/discord/remove-role', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ discordUserId: discordId }),
            })
          }
        }
      }
      setConfirmAction(null)
      setReason('')
      await loadData()
    }
    setActionLoading(null)
  }

  function formatDate(d: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pl-PL')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#16db65', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="px-6 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#111' }}>Subskrypcje</h1>
        <p className="text-sm" style={{ color: '#888' }}>Zarządzaj subskrypcjami użytkowników</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Aktywne', count: subscriptions.filter(s => s.status === 'active').length, color: '#16a34a' },
          { label: 'Zamrożone', count: subscriptions.filter(s => s.status === 'frozen').length, color: '#2563eb' },
          { label: 'Anulowane', count: subscriptions.filter(s => s.status === 'cancelled').length, color: '#dc2626' },
          { label: 'Darmowe', count: subscriptions.filter(s => s.is_free_via_coupon).length, color: '#888' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl p-4 border" style={{ borderColor: '#f0f0f0' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#888' }}>{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#f0f0f0' }}>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
              {['Użytkownik', 'Status', 'Okres do', 'Typ', 'Akcje'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold" style={{ color: '#888' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subscriptions.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm" style={{ color: '#888' }}>Brak subskrypcji</td></tr>
            ) : subscriptions.map(sub => {
              const statusStyle = STATUS_STYLES[sub.status] || STATUS_STYLES.inactive
              return (
                <tr key={sub.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: '#f0fdf4', color: '#16db65' }}>
                        {(sub.user_email || 'U')[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#111' }}>{sub.user_email || sub.user_id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                      {statusStyle.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm" style={{ color: '#555' }}>{formatDate(sub.current_period_end)}</td>
                  <td className="px-5 py-3">
                    {sub.is_free_via_coupon && (
                      <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: '#f5f5f5', color: '#888' }}>Darmowa</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {sub.status === 'active' && (
                        <>
                          <button
                            onClick={() => setConfirmAction({ id: sub.stripe_subscription_id, action: 'freeze', email: sub.user_email || '' })}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-blue-50"
                            style={{ color: '#2563eb' }}
                            title="Zamroź"
                          >
                            <FontAwesomeIcon icon={faSnowflake} style={{ fontSize: '11px' }} />
                            Zamroź
                          </button>
                          <button
                            onClick={() => setConfirmAction({ id: sub.stripe_subscription_id, action: 'cancel', email: sub.user_email || '' })}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-red-50"
                            style={{ color: '#dc2626' }}
                            title="Anuluj"
                          >
                            <FontAwesomeIcon icon={faBan} style={{ fontSize: '11px' }} />
                            Anuluj
                          </button>
                        </>
                      )}
                      {(sub.status === 'frozen' || sub.status === 'cancelled' || sub.status === 'inactive') && (
                        <button
                          onClick={() => setConfirmAction({ id: sub.stripe_subscription_id, action: 'reactivate', email: sub.user_email || '' })}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-green-50"
                          style={{ color: '#16a34a' }}
                          title="Reaktywuj"
                        >
                          <FontAwesomeIcon icon={faRotateRight} style={{ fontSize: '11px' }} />
                          Reaktywuj
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm modal */}
      {confirmAction && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-bold mb-2" style={{ color: '#111' }}>
              {confirmAction.action === 'cancel' ? 'Anuluj subskrypcję' :
               confirmAction.action === 'freeze' ? 'Zamroź subskrypcję' : 'Reaktywuj subskrypcję'}
            </h3>
            <p className="text-sm mb-4" style={{ color: '#555' }}>
              {confirmAction.action === 'cancel' ? 'Użytkownik straci dostęp natychmiast.' :
               confirmAction.action === 'freeze' ? 'Dostęp zostanie wstrzymany do wyjaśnienia.' :
               'Użytkownik odzyska pełny dostęp.'}
              <br /><strong>{confirmAction.email}</strong>
            </p>
            <input
              type="text"
              placeholder="Powód (opcjonalnie)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm mb-4 outline-none"
              style={{ borderColor: '#e5e5e5' }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmAction(null); setReason('') }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                style={{ borderColor: '#e5e5e5', color: '#555' }}
              >
                Anuluj
              </button>
              <button
                onClick={() => handleAction(confirmAction.id, confirmAction.action)}
                disabled={!!actionLoading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{
                  background: confirmAction.action === 'cancel' ? '#dc2626' :
                              confirmAction.action === 'freeze' ? '#2563eb' : '#16db65',
                  opacity: actionLoading ? 0.7 : 1
                }}
              >
                {actionLoading ? 'Procesowanie...' : 'Potwierdź'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
