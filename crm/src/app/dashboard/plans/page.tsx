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

type Plan = {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  stripe_price_id_monthly: string
  stripe_price_id_yearly: string
  features: string[]
  is_active: boolean
  created_at: string
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    price_monthly: '',
    price_yearly: '',
    stripe_price_id_monthly: '',
    stripe_price_id_yearly: '',
    features: '',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadPlans()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
  }

  async function loadPlans() {
    const { data, error } = await supabase
      .schema('payments')
      .from('plans')
      .select('*')
      .order('price_monthly', { ascending: true })
    if (!error && data) setPlans(data)
    setLoading(false)
  }

  async function savePlan() {
    if (!newPlan.name.trim()) return
    setSaving(true)

    const features = newPlan.features
      ? newPlan.features.split('\n').map(f => f.trim()).filter(Boolean)
      : []

    const payload = {
      name: newPlan.name,
      description: newPlan.description,
      price_monthly: parseFloat(newPlan.price_monthly) || 0,
      price_yearly: parseFloat(newPlan.price_yearly) || 0,
      stripe_price_id_monthly: newPlan.stripe_price_id_monthly,
      stripe_price_id_yearly: newPlan.stripe_price_id_yearly,
      features,
      is_active: true,
    }

    if (editingPlan) {
      const { error } = await supabase
        .schema('payments')
        .from('plans')
        .update(payload)
        .eq('id', editingPlan.id)
      if (!error) {
        setPlans(plans.map(p => p.id === editingPlan.id ? { ...editingPlan, ...payload } : p))
        setEditingPlan(null)
      }
    } else {
      const { data, error } = await supabase
        .schema('payments')
        .from('plans')
        .insert(payload)
        .select()
        .single()
      if (!error && data) setPlans([...plans, data])
    }

    setNewPlan({
      name: '', description: '', price_monthly: '', price_yearly: '',
      stripe_price_id_monthly: '', stripe_price_id_yearly: '', features: '',
    })
    setShowForm(false)
    setSaving(false)
  }

  function startEdit(plan: Plan) {
    setEditingPlan(plan)
    setNewPlan({
      name: plan.name,
      description: plan.description || '',
      price_monthly: plan.price_monthly?.toString() || '',
      price_yearly: plan.price_yearly?.toString() || '',
      stripe_price_id_monthly: plan.stripe_price_id_monthly || '',
      stripe_price_id_yearly: plan.stripe_price_id_yearly || '',
      features: plan.features?.join('\n') || '',
    })
    setShowForm(true)
  }

  async function toggleActive(planId: string, currentStatus: boolean) {
    const { error } = await supabase
      .schema('payments')
      .from('plans')
      .update({ is_active: !currentStatus })
      .eq('id', planId)
    if (!error) {
      setPlans(plans.map(p => p.id === planId ? { ...p, is_active: !currentStatus } : p))
    }
  }

  async function deletePlan(planId: string) {
    if (!confirm('Czy na pewno chcesz usunąć ten plan?')) return
    const { error } = await supabase
      .schema('payments')
      .from('plans')
      .delete()
      .eq('id', planId)
    if (!error) setPlans(plans.filter(p => p.id !== planId))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>← Wróć</Button>
          <h1 className="text-xl font-bold">Plany subskrypcji</h1>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setEditingPlan(null); }}>
          + Nowy plan
        </Button>
      </header>

      <main className="p-6 space-y-6">
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingPlan ? 'Edytuj plan' : 'Dodaj nowy plan'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nazwa planu</Label>
                  <Input
                    placeholder="np. Basic, Pro, Elite"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Opis</Label>
                  <Input
                    placeholder="Krótki opis planu..."
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cena miesięczna (USD)</Label>
                  <Input
                    type="number"
                    placeholder="np. 49"
                    value={newPlan.price_monthly}
                    onChange={(e) => setNewPlan({ ...newPlan, price_monthly: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cena roczna (USD)</Label>
                  <Input
                    type="number"
                    placeholder="np. 499"
                    value={newPlan.price_yearly}
                    onChange={(e) => setNewPlan({ ...newPlan, price_yearly: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stripe Price ID – miesięczny</Label>
                  <Input
                    placeholder="price_..."
                    value={newPlan.stripe_price_id_monthly}
                    onChange={(e) => setNewPlan({ ...newPlan, stripe_price_id_monthly: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stripe Price ID – roczny</Label>
                  <Input
                    placeholder="price_..."
                    value={newPlan.stripe_price_id_yearly}
                    onChange={(e) => setNewPlan({ ...newPlan, stripe_price_id_yearly: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Funkcje planu (każda w nowej linii)</Label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm min-h-24 bg-white resize-y"
                  placeholder="Dostęp do wszystkich kursów&#10;Daily market analysis&#10;Trading journal&#10;Discord community"
                  value={newPlan.features}
                  onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={savePlan} disabled={saving}>
                  {saving ? 'Zapisywanie...' : editingPlan ? 'Zapisz zmiany' : 'Dodaj plan'}
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowForm(false)
                  setEditingPlan(null)
                  setNewPlan({
                    name: '', description: '', price_monthly: '', price_yearly: '',
                    stripe_price_id_monthly: '', stripe_price_id_yearly: '', features: '',
                  })
                }}>Anuluj</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Wszystkie plany ({plans.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Ładowanie...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Cena miesięczna</TableHead>
                    <TableHead>Cena roczna</TableHead>
                    <TableHead>Stripe IDs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        Brak planów – dodaj pierwszy plan
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{plan.name}</p>
                            <p className="text-xs text-gray-400">{plan.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>${plan.price_monthly}/msc</TableCell>
                        <TableCell>${plan.price_yearly}/rok</TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-400 space-y-1">
                            <p>{plan.stripe_price_id_monthly || '—'}</p>
                            <p>{plan.stripe_price_id_yearly || '—'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                            {plan.is_active ? 'Aktywny' : 'Nieaktywny'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => startEdit(plan)}>
                              Edytuj
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => toggleActive(plan.id, plan.is_active)}>
                              {plan.is_active ? 'Wyłącz' : 'Włącz'}
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => deletePlan(plan.id)}>
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