'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Affiliate = {
  id: string
  user_id: string
  referral_code: string
  commission_percent: number
  affiliate_type: string
  level: number
  is_active: boolean
  created_at: string
  user_email?: string
}

type Wallet = {
  id: string
  affiliate_id: string
  balance: number
  pending_balance: number
  total_earned: number
  total_withdrawn: number
  minimum_payout: number
  currency: string
  updated_at: string
}

type Payout = {
  id: string
  affiliate_id: string
  amount: number
  currency: string
  status: string
  notes: string
  created_at: string
  affiliate_email?: string
}

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [wallets, setWallets] = useState<Map<string, Wallet>>(new Map())
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'affiliates' | 'payouts' | 'settings'>('affiliates')
  const [search, setSearch] = useState('')
  const [minPayout, setMinPayout] = useState('50')
  const [savingSettings, setSavingSettings] = useState(false)
  const [processingPayout, setProcessingPayout] = useState<string | null>(null)
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
    const { data: affiliatesData } = await supabase
      .schema('affiliates')
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false })

    if (affiliatesData) {
      const affiliatesWithEmail = await Promise.all(
        affiliatesData.map(async (a) => {
          const { data: userData } = await supabase
            .schema('core')
            .from('users')
            .select('email')
            .eq('id', a.user_id)
            .single()
          return { ...a, user_email: userData?.email || '—' }
        })
      )
      setAffiliates(affiliatesWithEmail)

      const { data: walletsData } = await supabase
        .schema('affiliates')
        .from('wallets')
        .select('*')

      if (walletsData) {
        const walletsMap = new Map<string, Wallet>()
        walletsData.forEach(w => walletsMap.set(w.affiliate_id, w))
        setWallets(walletsMap)
        if (walletsData[0]?.minimum_payout) {
          setMinPayout(walletsData[0].minimum_payout.toString())
        }
      }
    }

    const { data: payoutsData } = await supabase
      .schema('affiliates')
      .from('payouts')
      .select('*')
      .order('created_at', { ascending: false })

    if (payoutsData) {
      const payoutsWithEmail = await Promise.all(
        payoutsData.map(async (p) => {
          const { data: affiliateData } = await supabase
            .schema('affiliates')
            .from('affiliates')
            .select('user_id')
            .eq('id', p.affiliate_id)
            .single()
          if (affiliateData) {
            const { data: userData } = await supabase
              .schema('core')
              .from('users')
              .select('email')
              .eq('id', affiliateData.user_id)
              .single()
            return { ...p, affiliate_email: userData?.email || '—' }
          }
          return { ...p, affiliate_email: '—' }
        })
      )
      setPayouts(payoutsWithEmail)
    }

    setLoading(false)
  }

  async function toggleAffiliate(affiliateId: string, currentStatus: boolean) {
    const { error } = await supabase
      .schema('affiliates')
      .from('affiliates')
      .update({ is_active: !currentStatus })
      .eq('id', affiliateId)
    if (!error) {
      setAffiliates(affiliates.map(a =>
        a.id === affiliateId ? { ...a, is_active: !currentStatus } : a
      ))
    }
  }

  async function processPayout(payoutId: string) {
    if (!confirm('Czy potwierdzasz wykonanie tej wypłaty?')) return
    setProcessingPayout(payoutId)

    const payout = payouts.find(p => p.id === payoutId)
    if (!payout) return

    const { error } = await supabase
      .schema('affiliates')
      .from('payouts')
      .update({
        status: 'paid',
        processed_at: new Date().toISOString(),
      })
      .eq('id', payoutId)

    if (!error) {
      await supabase
        .schema('affiliates')
        .from('wallets')
        .update({
          balance: 0,
          pending_balance: 0,
          total_withdrawn: supabase.rpc('increment_withdrawn', {
            p_affiliate_id: payout.affiliate_id,
            p_amount: payout.amount,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq('affiliate_id', payout.affiliate_id)

      setPayouts(payouts.map(p =>
        p.id === payoutId ? { ...p, status: 'paid' } : p
      ))
    }
    setProcessingPayout(null)
  }

  async function saveMinPayout() {
    setSavingSettings(true)
    const { error } = await supabase
      .schema('affiliates')
      .from('wallets')
      .update({ minimum_payout: parseFloat(minPayout) })
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (!error) alert('Ustawienia zapisane')
    setSavingSettings(false)
  }

  function formatDate(dateString: string) {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('pl-PL')
  }

  const filteredAffiliates = affiliates.filter(a =>
    a.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    a.referral_code?.toLowerCase().includes(search.toLowerCase())
  )

  const pendingPayouts = payouts.filter(p => p.status === 'pending')
  const totalPending = pendingPayouts.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>← Wróć</Button>
          <h1 className="text-xl font-bold">Program afiliacyjny</h1>
        </div>
      </header>

      <main className="p-6 space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Afiliaci</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{affiliates.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Aktywni</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{affiliates.filter(a => a.is_active).length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Oczekujące wypłaty</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{pendingPayouts.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Do wypłaty (GBP)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">£{totalPending.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 border-b">
          {(['affiliates', 'payouts', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-black'
              }`}
            >
              {tab === 'affiliates' ? 'Afiliaci' : tab === 'payouts' ? 'Wypłaty' : 'Ustawienia'}
            </button>
          ))}
        </div>

        {activeTab === 'affiliates' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Wszyscy afiliaci ({filteredAffiliates.length})</CardTitle>
                <Input
                  placeholder="Szukaj po emailu lub kodzie..."
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
                      <TableHead>Kod</TableHead>
                      <TableHead>Typ</TableHead>
                      <TableHead>Prowizja</TableHead>
                      <TableHead>Portfel (GBP)</TableHead>
                      <TableHead>Oczekuje</TableHead>
                      <TableHead>Zarobiono</TableHead>
                      <TableHead>Min. wypłata</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAffiliates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-gray-500">
                          Brak afiliatów
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAffiliates.map((affiliate) => {
                        const wallet = wallets.get(affiliate.id)
                        return (
                          <TableRow key={affiliate.id}>
                            <TableCell className="text-sm">{affiliate.user_email}</TableCell>
                            <TableCell className="font-mono text-xs">{affiliate.referral_code}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {affiliate.affiliate_type || 'standard'}
                              </Badge>
                            </TableCell>
                            <TableCell>{affiliate.commission_percent}%</TableCell>
                            <TableCell className="font-medium">
                              £{wallet ? wallet.balance.toFixed(2) : '0.00'}
                            </TableCell>
                            <TableCell className="text-amber-600">
                              £{wallet ? wallet.pending_balance.toFixed(2) : '0.00'}
                            </TableCell>
                            <TableCell className="text-green-600">
                              £{wallet ? wallet.total_earned.toFixed(2) : '0.00'}
                            </TableCell>
                            <TableCell>
                              £{wallet ? wallet.minimum_payout.toFixed(2) : '50.00'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={affiliate.is_active ? 'default' : 'secondary'}>
                                {affiliate.is_active ? 'Aktywny' : 'Nieaktywny'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleAffiliate(affiliate.id, affiliate.is_active)}
                                >
                                  {affiliate.is_active ? 'Wyłącz' : 'Włącz'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'payouts' && (
          <Card>
            <CardHeader>
              <CardTitle>Historia wypłat</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Afiliat</TableHead>
                    <TableHead>Kwota</TableHead>
                    <TableHead>Waluta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        Brak wypłat
                      </TableCell>
                    </TableRow>
                  ) : (
                    payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="text-sm">{payout.affiliate_email}</TableCell>
                        <TableCell className="font-medium">£{payout.amount.toFixed(2)}</TableCell>
                        <TableCell>{payout.currency?.toUpperCase()}</TableCell>
                        <TableCell>
                          <Badge variant={payout.status === 'paid' ? 'default' : 'secondary'}>
                            {payout.status === 'paid' ? 'Wypłacono' : 'Oczekuje'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(payout.created_at)}</TableCell>
                        <TableCell>
                          {payout.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => processPayout(payout.id)}
                              disabled={processingPayout === payout.id}
                            >
                              {processingPayout === payout.id ? 'Przetwarzanie...' : 'Zatwierdź wypłatę'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>Ustawienia programu afiliacyjnego</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Minimalna kwota wypłaty</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-sm">£</span>
                    <Input
                      type="number"
                      value={minPayout}
                      onChange={(e) => setMinPayout(e.target.value)}
                      className="w-32"
                    />
                  </div>
                  <Button onClick={saveMinPayout} disabled={savingSettings}>
                    {savingSettings ? 'Zapisywanie...' : 'Zapisz'}
                  </Button>
                </div>
                <p className="text-xs text-gray-400">
                  Wypłata zostanie zainicjowana tylko gdy saldo afiliata przekroczy tę kwotę
                </p>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-medium">Prowizje per poziom</h3>
                <p className="text-sm text-gray-500">
                  Zarządzaj prowizjami w sekcji ustawień platformy
                </p>
                <Button variant="outline" onClick={() => router.push('/dashboard/settings')}>
                  Przejdź do ustawień prowizji →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      </main>
    </div>
  )
}