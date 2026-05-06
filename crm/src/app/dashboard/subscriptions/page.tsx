'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Subscription = {
  id: string
  status: string
  current_period_start: string
  current_period_end: string
  created_at: string
  user: {
    email: string
    role: string
  } | null
  plan: {
    name: string
    price_monthly: number
  } | null
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadSubscriptions()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
    }
  }

  async function loadSubscriptions() {
    const { data, error } = await supabase
      .schema('payments')
      .from('subscriptions')
      .select(`
        id,
        status,
        current_period_start,
        current_period_end,
        created_at
      `)
      .order('created_at', { ascending: false })

    console.log('data:', data)
    console.log('error:', error)

    if (!error && data) {
      setSubscriptions(data as any)
    }
    setLoading(false)
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active': return 'default'
      case 'cancelled': return 'destructive'
      case 'past_due': return 'destructive'
      default: return 'secondary'
    }
  }

  function formatDate(dateString: string) {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('pl-PL')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>← Wróć</Button>
          <h1 className="text-xl font-bold">Subskrypcje</h1>
        </div>
      </header>

      <main className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Wszystkie subskrypcje ({subscriptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Ładowanie...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Okres od</TableHead>
                    <TableHead>Okres do</TableHead>
                    <TableHead>Data utworzenia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        Brak subskrypcji
                      </TableCell>
                    </TableRow>
                  ) : (
                    subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-mono text-xs">{sub.id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadge(sub.status) as any}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(sub.current_period_start)}</TableCell>
                        <TableCell>{formatDate(sub.current_period_end)}</TableCell>
                        <TableCell>{formatDate(sub.created_at)}</TableCell>
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