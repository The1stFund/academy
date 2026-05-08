'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

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
}

export default function CheckoutPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
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
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })
    if (!error && data) setPlans(data)
    setLoading(false)
  }

  async function handleCheckout(plan: Plan) {
    const priceId = billingPeriod === 'monthly'
      ? plan.stripe_price_id_monthly
      : plan.stripe_price_id_yearly

    if (!priceId) {
      alert('Ten plan nie ma jeszcze skonfigurowanego Stripe Price ID')
      return
    }

    setProcessingId(plan.id)

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId,
        planId: plan.id,
        billingPeriod,
      }),
    })

    const data = await res.json()

    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Błąd: ' + data.error)
      setProcessingId(null)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Ładowanie...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold">The1st Academy – Wybierz plan</h1>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        <div className="flex justify-center mb-8">
          <div className="bg-white border rounded-lg p-1 flex gap-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Miesięcznie
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                billingPeriod === 'yearly'
                  ? 'bg-black text-white'
                  : 'text-gray-600 hover:text-black'
              }`}
            >
              Rocznie
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Oszczędzasz
              </span>
            </button>
          </div>
        </div>

        {plans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Brak aktywnych planów
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.id} className="relative">
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.description && (
                    <p className="text-gray-500 text-sm">{plan.description}</p>
                  )}
                  <div className="mt-4">
                    <span className="text-3xl font-bold">
                      £{billingPeriod === 'monthly' ? plan.price_monthly : plan.price_yearly}
                    </span>
                    <span className="text-gray-500 text-sm ml-1">
                      /{billingPeriod === 'monthly' ? 'msc' : 'rok'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {plan.features && plan.features.length > 0 && (
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-green-500">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    className="w-full"
                    onClick={() => handleCheckout(plan)}
                    disabled={processingId === plan.id}
                  >
                    {processingId === plan.id ? 'Przekierowanie...' : 'Wybierz plan'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}