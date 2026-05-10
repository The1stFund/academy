'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type UserData = {
  id: string
  email: string
  role: string
  full_name?: string
}

type Subscription = {
  status: string
  current_period_end: string
}

export default function StudentDashboard() {
  const [user, setUser] = useState<UserData | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUserData()
  }, [])

  async function loadUserData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data: coreUser } = await supabase
      .schema('core')
      .from('users')
      .select('id, email, role')
      .eq('auth_user_id', session.user.id)
      .single()

    if (coreUser) {
      const { data: profile } = await supabase
        .schema('core')
        .from('profiles')
        .select('full_name')
        .eq('user_id', coreUser.id)
        .single()

      setUser({
        id: coreUser.id,
        email: coreUser.email,
        role: coreUser.role,
        full_name: profile?.full_name,
      })

      const { data: sub } = await supabase
        .schema('payments')
        .from('subscriptions')
        .select('status, current_period_end')
        .eq('user_id', coreUser.id)
        .eq('status', 'active')
        .single()

      if (sub) setSubscription(sub)
    }

    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function formatDate(dateString: string) {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('pl-PL')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Ładowanie...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold">The1st Academy</span>
          <Badge variant="secondary">{user?.role || 'student'}</Badge>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <Button variant="outline" size="sm" onClick={handleLogout}>Wyloguj</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Witaj{user?.full_name ? `, ${user.full_name}` : ''}! 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {subscription
              ? `Subskrypcja aktywna do ${formatDate(subscription.current_period_end)}`
              : 'Brak aktywnej subskrypcji'
            }
          </p>
        </div>

        {!subscription && (
          <Card className="border-2 border-amber-200 bg-amber-50">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="font-medium">Nie masz aktywnej subskrypcji</p>
                <p className="text-sm text-gray-500">Kup dostęp żeby odblokować wszystkie kursy i analizy</p>
              </div>
              <Link href="/pricing">
                <Button>Kup dostęp – £49/msc</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/courses')}>
            <CardHeader>
              <div className="text-2xl mb-2">🎓</div>
              <CardTitle>Kursy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Przeglądaj i ucz się z naszych kursów tradingowych</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/analysis')}>
            <CardHeader>
              <div className="text-2xl mb-2">📊</div>
              <CardTitle>Analizy rynku</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Codzienne analizy i prognozy od ekspertów</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/leaderboard')}>
            <CardHeader>
              <div className="text-2xl mb-2">🏆</div>
              <CardTitle>Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Ranking najlepszych traderów platformy</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/affiliate')}>
            <CardHeader>
              <div className="text-2xl mb-2">🤝</div>
              <CardTitle>Program afiliacyjny</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Twój link polecający i zarobione prowizje</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/profile')}>
            <CardHeader>
              <div className="text-2xl mb-2">👤</div>
              <CardTitle>Profil</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Zarządzaj swoim profilem i subskrypcją</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow bg-indigo-50 border-indigo-200"
            onClick={() => window.open('https://discord.gg/', '_blank')}>
            <CardHeader>
              <div className="text-2xl mb-2">💬</div>
              <CardTitle>Discord</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm">Dołącz do społeczności traderów</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}