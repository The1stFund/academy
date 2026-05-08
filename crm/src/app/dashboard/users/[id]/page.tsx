'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type User = {
  id: string
  auth_user_id: string
  email: string
  role: string
  created_at: string
  updated_at: string
}

type Profile = {
  id: string
  full_name: string
  avatar_url: string
  discord_id: string
  country: string
  timezone: string
}

type Subscription = {
  id: string
  status: string
  current_period_start: string
  current_period_end: string
  created_at: string
}

export default function UserDetailPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    full_name: '',
    discord_id: '',
    country: '',
    timezone: '',
  })
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadUserData()
  }, [userId])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
  }

  async function loadUserData() {
    const { data: userData } = await supabase
      .schema('core')
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userData) {
      setUser(userData)

      const { data: profileData } = await supabase
        .schema('core')
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (profileData) {
        setProfile(profileData)
        setProfileData({
          full_name: profileData.full_name || '',
          discord_id: profileData.discord_id || '',
          country: profileData.country || '',
          timezone: profileData.timezone || '',
        })
      }

      const { data: subData } = await supabase
        .schema('payments')
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (subData) setSubscription(subData)
    }

    setLoading(false)
  }

  async function saveProfile() {
    if (!profile) return
    setSaving(true)

    const { error } = await supabase
      .schema('core')
      .from('profiles')
      .update(profileData)
      .eq('user_id', userId)

    if (!error) {
      setProfile({ ...profile, ...profileData })
      setEditingProfile(false)
    }
    setSaving(false)
  }

  async function changeRole(newRole: string) {
    if (!user) return
    const { error } = await supabase
      .schema('core')
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
    if (!error) setUser({ ...user, role: newRole })
  }

  async function cancelSubscription() {
    if (!subscription) return
    if (!confirm('Czy na pewno chcesz anulować subskrypcję tego użytkownika?')) return

    const { error } = await supabase
      .schema('payments')
      .from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', subscription.id)

    if (!error) setSubscription({ ...subscription, status: 'cancelled' })
  }

  async function resetPassword() {
    if (!user) return
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    })
    const data = await res.json()
    if (data.success) {
      alert('Email z resetem hasła został wysłany')
    } else {
      alert('Błąd: ' + data.error)
    }
  }

  function formatDate(dateString: string) {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('pl-PL')
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active': return 'default'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Ładowanie...</p>
    </div>
  )

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Użytkownik nie znaleziony</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard/users')}>← Wróć</Button>
          <h1 className="text-xl font-bold">{user.email}</h1>
          <Badge variant={user.role === 'admin' || user.role === 'super_admin' ? 'destructive' : 'secondary'}>
            {user.role}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetPassword}>
            Reset hasła
          </Button>
        </div>
      </header>

      <main className="p-6 space-y-6 max-w-4xl mx-auto">

        <Card>
          <CardHeader>
            <CardTitle>Informacje o koncie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-gray-500">Data rejestracji</p>
                <p className="font-medium">{formatDate(user.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500">ID użytkownika</p>
                <p className="font-mono text-xs text-gray-400">{user.id}</p>
              </div>
              <div>
                <p className="text-gray-500">Auth ID</p>
                <p className="font-mono text-xs text-gray-400">{user.auth_user_id}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rola</Label>
              <div className="flex gap-2 flex-wrap">
                {['student', 'trainer', 'affiliate', 'admin', 'super_admin'].map(role => (
                  <Button
                    key={role}
                    size="sm"
                    variant={user.role === role ? 'default' : 'outline'}
                    onClick={() => changeRole(role)}
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Profil</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setEditingProfile(!editingProfile)}>
                {editingProfile ? 'Anuluj' : 'Edytuj'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {editingProfile ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Imię i nazwisko</Label>
                    <Input
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discord ID</Label>
                    <Input
                      value={profileData.discord_id}
                      onChange={(e) => setProfileData({ ...profileData, discord_id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kraj</Label>
                    <Input
                      value={profileData.country}
                      onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Strefa czasowa</Label>
                    <Input
                      value={profileData.timezone}
                      onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? 'Zapisywanie...' : 'Zapisz profil'}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Imię i nazwisko</p>
                  <p className="font-medium">{profile?.full_name || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Discord ID</p>
                  <p className="font-medium">{profile?.discord_id || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Kraj</p>
                  <p className="font-medium">{profile?.country || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Strefa czasowa</p>
                  <p className="font-medium">{profile?.timezone || '—'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subskrypcja</CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Status</p>
                    <Badge variant={getStatusBadge(subscription.status) as any}>
                      {subscription.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-gray-500">Data rozpoczęcia</p>
                    <p className="font-medium">{formatDate(subscription.current_period_start)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Data zakończenia okresu</p>
                    <p className="font-medium">{formatDate(subscription.current_period_end)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Utworzona</p>
                    <p className="font-medium">{formatDate(subscription.created_at)}</p>
                  </div>
                </div>
                {subscription.status === 'active' && (
                  <Button variant="destructive" size="sm" onClick={cancelSubscription}>
                    Anuluj subskrypcję
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Brak aktywnej subskrypcji</p>
            )}
          </CardContent>
        </Card>

      </main>
    </div>
  )
}