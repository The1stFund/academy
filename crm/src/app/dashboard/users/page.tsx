'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type User = {
  id: string
  auth_user_id: string
  email: string
  role: string
  created_at: string
  suspended?: boolean
  subscription_status?: string
  current_period_start?: string
  current_period_end?: string
  is_free_via_coupon?: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'student' })
  const [saving, setSaving] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadUsers()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
  }

  async function loadUsers() {
    const { data, error } = await supabase.rpc('get_users_with_subscriptions')
    if (!error && data) setUsers(data as User[])
    setLoading(false)
  }

  async function changeRole(userId: string, newRole: string) {
    const { error } = await supabase.rpc('update_user_role', {
      p_user_id: userId,
      p_role: newRole,
    })
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } else {
      alert('Błąd zmiany roli: ' + error.message)
    }
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Czy na pewno chcesz usunąć użytkownika ${email}? Ta operacja jest nieodwracalna.`)) return

    const { error } = await supabase.rpc('delete_user', { p_user_id: userId })

    if (!error) {
      setUsers(users.filter(u => u.id !== userId))
    } else {
      alert('Błąd podczas usuwania: ' + error.message)
    }
  }

  async function addUserManually() {
    if (!newUser.email.trim() || !newUser.password.trim()) return
    setSaving(true)

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })

    const data = await res.json()

    if (data.error) {
      alert('Błąd: ' + data.error)
    } else {
      await loadUsers()
      setNewUser({ email: '', password: '', role: 'student' })
      setShowAddForm(false)
    }
    setSaving(false)
  }

  function getRoleBadgeColor(role: string) {
    switch (role) {
      case 'super_admin': return 'destructive'
      case 'admin': return 'destructive'
      case 'trainer': return 'default'
      case 'affiliate': return 'secondary'
      default: return 'outline'
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pl-PL')
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>← Wróć</Button>
          <h1 className="text-xl font-bold">Użytkownicy</h1>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>+ Dodaj użytkownika</Button>
      </header>

      <main className="p-6 space-y-6">
        {showAddForm && (
          <Card>
            <CardHeader><CardTitle>Dodaj użytkownika ręcznie</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="uzytkownik@email.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hasło tymczasowe</Label>
                  <Input
                    type="password"
                    placeholder="Min. 8 znaków"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rola</Label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full text-sm border rounded px-3 py-2 bg-white"
                  >
                    <option value="student">student</option>
                    <option value="trainer">trainer</option>
                    <option value="affiliate">affiliate</option>
                    <option value="admin">admin</option>
                    <option value="super_admin">super_admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addUserManually} disabled={saving}>
                  {saving ? 'Tworzenie...' : 'Utwórz użytkownika'}
                </Button>
                <Button variant="outline" onClick={() => setShowAddForm(false)}>Anuluj</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Wszyscy użytkownicy ({filteredUsers.length})</CardTitle>
              <Input
                placeholder="Szukaj po emailu lub roli..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Ładowanie...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Rola</TableHead>
                    <TableHead>Subskrypcja</TableHead>
                    <TableHead>Ważna do</TableHead>
                    <TableHead>Rejestracja</TableHead>
                    <TableHead>Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        Brak użytkowników
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <select
                            value={user.role}
                            onChange={(e) => changeRole(user.id, e.target.value)}
                            className="text-sm border rounded px-2 py-1 bg-white"
                          >
                            <option value="student">student</option>
                            <option value="trainer">trainer</option>
                            <option value="affiliate">affiliate</option>
                            <option value="admin">admin</option>
                            <option value="super_admin">super_admin</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          {user.subscription_status ? (
                            <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{
                              background: user.subscription_status === 'active' ? '#f0fdf4' : '#eff6ff',
                              color: user.subscription_status === 'active' ? '#16a34a' : '#2563eb'
                            }}>
                              {user.subscription_status === 'active' ? 'Aktywna' : 'Zamrożona'}
                              {user.is_free_via_coupon ? ' (darmowa)' : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Brak</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {user.current_period_end ? formatDate(user.current_period_end) : '—'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(user.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/users/${user.id}`)}
                            >
                              Szczegóły
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteUser(user.id, user.email)}
                            >
                              Usuń
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}