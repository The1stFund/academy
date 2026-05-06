'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type User = {
  id: string
  email: string
  role: string
  created_at: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadUsers()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
    }
  }

  async function loadUsers() {
    const { data, error } = await supabase
      .schema('core')
      .from('users')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: false })

    console.log('data:', data)
    console.log('error:', error)

    if (!error && data) {
      setUsers(data)
    }
    setLoading(false)
  }

  async function changeRole(userId: string, newRole: string) {
    const { error } = await supabase
      .schema('core')
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)

    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>← Wróć</Button>
          <h1 className="text-xl font-bold">Użytkownicy</h1>
        </div>
      </header>

      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Wszyscy użytkownicy ({users.length})</CardTitle>
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
                    <TableHead>Data rejestracji</TableHead>
                    <TableHead>Zmień rolę</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-gray-500">
                        Brak użytkowników
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeColor(user.role) as any}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
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