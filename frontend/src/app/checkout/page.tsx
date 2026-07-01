'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const PLANS = {
  monthly: { priceId: 'price_1TUUuw0tKvZv0CxQWE6ioZVv', label: 'Miesięczny', price: '£49/msc' },
  annual: { priceId: 'price_1TUV0x0tKvZv0CxQMzknD0zV', label: 'Roczny', price: '£499/rok' },
}

function CheckoutForm() {
  const params = useSearchParams()
  const planKey = (params.get('plan') === 'annual' ? 'annual' : 'monthly') as keyof typeof PLANS
  const plan = PLANS[planKey]
  const referralCode = params.get('ref') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  async function startStripeCheckout(userId: string) {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: plan.priceId, userId, referralCode }),
    })
    const data = await res.json()

    if (data.url) {
      window.location.href = data.url
    } else {
      setError(data.error || 'Nie udało się utworzyć sesji płatności.')
      setLoading(false)
      setCheckingSession(false)
    }
  }

  useEffect(() => {
    async function checkExistingSession() {
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        setCheckingSession(false)
        return
      }

      // Already logged in — skip the signup form and go straight to Stripe.
      // Pass auth_user_id directly; the API route resolves core.users server-side.
      setLoading(true)
      await startStripeCheckout(sessionData.session.user.id)
    }

    checkExistingSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Hasło musi mieć minimum 8 znaków'); return }
    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) { setError('Konto utworzone, ale wystąpił problem z logowaniem. Spróbuj się zalogować.'); setLoading(false); return }
    }

    const { data: sessionData2 } = await supabase.auth.getSession()
    const authUserId = sessionData2.session?.user?.id

    if (!authUserId) {
      setError('Nie udało się znaleźć konta. Spróbuj odświeżyć stronę.')
      setLoading(false)
      return
    }

    await startStripeCheckout(authUserId)
  }

  if (checkingSession) {
    return <div className="text-sm text-gray-400">Ładowanie...</div>
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center gap-2 mb-8">
        <img src="/the1stacademy_Logo_sygnet.svg" alt="Logo" style={{ width: '32px', height: '32px' }} />
        <span className="font-bold tracking-tight">THE 1ST <span style={{ color: '#16db65' }}>ACADEMY</span></span>
      </div>

      <div className="mb-6 p-4 rounded-xl" style={{ background: '#f0fdf4' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: '#16db65' }}>WYBRANY PLAN</p>
        <p className="font-bold" style={{ color: '#111' }}>{plan.label} — {plan.price}</p>
      </div>

      <h1 className="text-2xl font-bold mb-1" style={{ color: '#111' }}>Utwórz konto i zapłać</h1>
      <p className="text-sm mb-6" style={{ color: '#888' }}>Po utworzeniu konta przejdziesz do bezpiecznej płatności Stripe</p>

      <form onSubmit={handleCheckout} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>EMAIL</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor: '#e5e7eb' }} />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>HASŁO</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 8 znaków"
            className="w-full px-4 py-3 rounded-xl border text-sm outline-none" style={{ borderColor: '#e5e7eb' }} />
        </div>
        {error && <p className="text-xs font-medium" style={{ color: '#ef4444' }}>{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full py-3.5 rounded-xl font-bold text-sm text-white disabled:opacity-60"
          style={{ background: '#16db65' }}>
          {loading ? 'Przetwarzanie...' : 'Przejdź do płatności'}
        </button>
      </form>

      <p className="text-center text-sm mt-6" style={{ color: '#888' }}>
        Masz już konto? <Link href="/login" className="font-bold" style={{ color: '#16db65' }}>Zaloguj się</Link>
      </p>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <Suspense fallback={<div className="text-sm text-gray-400">Ładowanie...</div>}>
        <CheckoutForm />
      </Suspense>
    </div>
  )
}
