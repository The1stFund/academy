'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUsers, faCreditCard, faChartLine, faHandshake, faBookOpen, faListCheck, faChartBar, faGear } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalUsers: 0, activeSubscriptions: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    const { count: usersCount } = await supabase.schema('core').from('users').select('*', { count: 'exact', head: true })
    const { count: subsCount } = await supabase.schema('payments').from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active')
    const { data: payments } = await supabase.schema('payments').from('payments').select('amount')
    const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
    setStats({ totalUsers: usersCount || 0, activeSubscriptions: subsCount || 0, totalRevenue })
    setLoading(false)
  }

  const statCards = [
    { label: 'Użytkownicy', value: stats.totalUsers, icon: faUsers, color: '#16db65' },
    { label: 'Aktywne subskrypcje', value: stats.activeSubscriptions, icon: faCreditCard, color: '#16db65' },
    { label: 'Przychód (GBP)', value: `£${stats.totalRevenue.toFixed(2)}`, icon: faChartLine, color: '#16db65' },
  ]

  const menuItems = [
    { icon: faUsers, label: 'Użytkownicy', desc: 'Zarządzaj kontami i rolami', href: '/dashboard/users' },
    { icon: faCreditCard, label: 'Subskrypcje', desc: 'Przegląd płatności i subskrypcji', href: '/dashboard/subscriptions' },
    { icon: faBookOpen, label: 'Treści', desc: 'Kursy, analizy i materiały', href: '/dashboard/content' },
    { icon: faListCheck, label: 'Plany', desc: 'Plany i ceny subskrypcji', href: '/dashboard/plans' },
    { icon: faHandshake, label: 'Afiliacja', desc: 'Afiliaci, prowizje i wypłaty', href: '/dashboard/affiliates' },
    { icon: faChartBar, label: 'Raporty', desc: 'Przychody i statystyki', href: '/dashboard/reports' },
    { icon: faGear, label: 'Ustawienia', desc: 'Konfiguracja platformy', href: '/dashboard/settings' },
  ]

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-screen">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#16db65', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#111' }}>Dashboard</h1>
        <p className="text-sm" style={{ color: '#888' }}>Przegląd platformy The 1st Academy</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl p-5 border" style={{ borderColor: '#f0f0f0' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium" style={{ color: '#888' }}>{card.label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                <FontAwesomeIcon icon={card.icon} style={{ color: card.color, fontSize: '14px' }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: '#111' }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Menu cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {menuItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-2xl p-5 border transition-all hover:border-gray-200 hover:shadow-sm"
            style={{ borderColor: '#f0f0f0' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: '#f0fdf4' }}>
              <FontAwesomeIcon icon={item.icon} style={{ color: '#16db65', fontSize: '16px' }} />
            </div>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#111' }}>{item.label}</h3>
            <p className="text-xs" style={{ color: '#aaa' }}>{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
