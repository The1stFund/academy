'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const unauthorized = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('error') === 'unauthorized'
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Nieprawidłowy email lub hasło'); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      {/* Lewa kolumna – ciemna */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12" style={{ background: '#111' }}>
        <div className="flex items-center gap-3">
          <img src="/the1stacademy_Logo_sygnet_white.svg" alt="Logo" style={{ width: '36px', height: '36px' }} />
          <span className="text-white font-bold text-lg tracking-tight">
            THE 1ST <span style={{ color: '#16db65' }}>ACADEMY</span>
          </span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Panel<br />administracyjny
          </h1>
          <p style={{ color: '#666' }} className="text-sm">
            Zarządzaj użytkownikami, subskrypcjami, treściami i programem afiliacyjnym.
          </p>
        </div>
        <p className="text-xs" style={{ color: '#444' }}>© 2026 The 1st Academy Ltd</p>
      </div>

      {/* Prawa kolumna – formularz */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src="/the1stacademy_Logo_sygnet.svg" alt="Logo" style={{ width: '32px', height: '32px' }} />
            <span className="font-bold text-base tracking-tight" style={{ color: '#111' }}>
              THE 1ST <span style={{ color: '#16db65' }}>ACADEMY</span>
            </span>
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: '#111' }}>Zaloguj się</h2>
          <p className="text-sm mb-6" style={{ color: '#888' }}>Dostęp tylko dla administratorów</p>
          {unauthorized && <div className="mb-4 px-4 py-3 rounded-xl text-xs font-medium" style={{ background: '#fef2f2', color: '#dc2626' }}>Brak uprawnień do panelu administracyjnego.</div>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@the1st.academy"
                required
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={{ borderColor: '#e5e5e5', color: '#111' }}
                onFocus={e => e.target.style.borderColor = '#16db65'}
                onBlur={e => e.target.style.borderColor = '#e5e5e5'}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>Hasło</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={{ borderColor: '#e5e5e5', color: '#111' }}
                onFocus={e => e.target.style.borderColor = '#16db65'}
                onBlur={e => e.target.style.borderColor = '#e5e5e5'}
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-opacity"
              style={{ background: '#16db65', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Logowanie...' : 'Zaloguj się'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
