'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Payment = {
  id: string
  amount: number
  currency: string
  status: string
  created_at: string
  user_email?: string
}

type MonthlyStats = {
  month: string
  revenue: number
  count: number
}

export default function ReportsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalPayments, setTotalPayments] = useState(0)
  const [activeSubscriptions, setActiveSubscriptions] = useState(0)
  const [cancelledSubscriptions, setCancelledSubscriptions] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadData()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
  }

  async function loadData() {
    const { data: paymentsData } = await supabase
      .schema('payments')
      .from('payments')
      .select('*')
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false })

    if (paymentsData) {
      const paymentsWithEmail = await Promise.all(
        paymentsData.map(async (p) => {
          const { data: userData } = await supabase
            .schema('core')
            .from('users')
            .select('email')
            .eq('id', p.user_id)
            .single()
          return { ...p, user_email: userData?.email || '—' }
        })
      )
      setPayments(paymentsWithEmail)

      const total = paymentsData.reduce((sum, p) => sum + p.amount, 0)
      setTotalRevenue(total)
      setTotalPayments(paymentsData.length)

      const monthly = paymentsData.reduce((acc: Record<string, MonthlyStats>, p) => {
        const month = new Date(p.created_at).toLocaleDateString('pl-PL', { year: 'numeric', month: 'long' })
        if (!acc[month]) acc[month] = { month, revenue: 0, count: 0 }
        acc[month].revenue += p.amount
        acc[month].count += 1
        return acc
      }, {})
      setMonthlyStats(Object.values(monthly))
    }

    const { count: activeSubs } = await supabase
      .schema('payments')
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: cancelledSubs } = await supabase
      .schema('payments')
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')

    setActiveSubscriptions(activeSubs || 0)
    setCancelledSubscriptions(cancelledSubs || 0)
    setLoading(false)
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
          <h1 className="text-xl font-bold">Raporty finansowe</h1>
        </div>
      </header>

      <main className="p-6 space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Łączny przychód</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">£{totalRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Liczba płatności</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{totalPayments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Aktywne subskrypcje</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{activeSubscriptions}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Anulowane subskrypcje</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">{cancelledSubscriptions}</p>
            </CardContent>
          </Card>
        </div>

        {monthlyStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Przychody miesięczne</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Miesiąc</TableHead>
                    <TableHead>Liczba płatności</TableHead>
                    <TableHead>Przychód (GBP)</TableHead>
                    <TableHead>Średnia płatność</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyStats.map((stat) => (
                    <TableRow key={stat.month}>
                      <TableCell className="font-medium">{stat.month}</TableCell>
                      <TableCell>{stat.count}</TableCell>
                      <TableCell className="font-medium text-green-600">
                        £{stat.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        £{(stat.revenue / stat.count).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Historia płatności ({payments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Ładowanie...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Użytkownik</TableHead>
                    <TableHead>Kwota</TableHead>
                    <TableHead>Waluta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        Brak płatności
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-sm">{payment.user_email}</TableCell>
                        <TableCell className="font-medium">
                          £{payment.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>{payment.currency?.toUpperCase()}</TableCell>
                        <TableCell>
                          <Badge variant="default">
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(payment.created_at)}</TableCell>
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