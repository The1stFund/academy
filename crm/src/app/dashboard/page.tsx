'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    totalTrades: 0,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadStats()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    setLoading(false)
  }

  async function loadStats() {
    const { count: usersCount } = await supabase
      .schema('core')
      .from('users')
      .select('*', { count: 'exact', head: true })

    const { count: subsCount } = await supabase
      .schema('payments')
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: tradesCount } = await supabase
      .schema('trading')
      .from('trades')
      .select('*', { count: 'exact', head: true })

    setStats({
      totalUsers: usersCount || 0,
      activeSubscriptions: subsCount || 0,
      totalRevenue: 0,
      totalTrades: tradesCount || 0,
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Ładowanie...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">The1st Academy</h1>
          <Badge variant="secondary">Admin</Badge>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Wyloguj
        </Button>
      </header>

      <main className="p-6">
        <h2 className="text-2xl font-semibold mb-6">Dashboard</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Użytkownicy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Aktywne subskrypcje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.activeSubscriptions}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Przychód (GBP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">£{stats.totalRevenue}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Transakcje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalTrades}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/users')}>
            <CardHeader>
              <CardTitle>Użytkownicy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Zarządzaj kontami użytkowników i rolami</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/subscriptions')}>
            <CardHeader>
              <CardTitle>Subskrypcje</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Przegląd płatności i subskrypcji</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/content')}>
            <CardHeader>
              <CardTitle>Treści</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Zarządzaj kursami i analizami rynku</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/plans')}>
            <CardHeader>
              <CardTitle>Plany subskrypcji</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Zarządzaj planami i cenami subskrypcji</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/affiliates')}>
            <CardHeader>
              <CardTitle>Program afiliacyjny</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Afiliaci, prowizje i wypłaty</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/reports')}>
            <CardHeader>
              <CardTitle>Raporty finansowe</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Przychody, statystyki i analizy</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/dashboard/settings')}>
            <CardHeader>
              <CardTitle>Ustawienia platformy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Prowizje, progi wypłat, konfiguracja</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}