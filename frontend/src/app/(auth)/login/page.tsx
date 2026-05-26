'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine, faGraduationCap, faTrophy, faComments } from '@fortawesome/free-solid-svg-icons'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Nieprawidłowy email lub hasło')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>

      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12" style={{ background: '#111' }}>
        <Link href="/" className="flex items-center gap-3">
          <img src="/the1stacademy_Logo_sygnet_white.svg" alt="Logo" style={{ width: '36px', height: '36px' }} />
          <span className="text-white font-bold tracking-tight">THE 1ST <span style={{ color: '#16db65' }}>ACADEMY</span></span>
        </Link>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            Zacznij tradować<br />
            jak <span style={{ color: '#16db65' }}>profesjonalista</span>
          </h2>
          <div className="space-y-4">
            {[
              { icon: faChartLine, text: 'Codzienne analizy rynku od ekspertów' },
              { icon: faGraduationCap, text: 'Kompleksowe kursy wideo' },
              { icon: faTrophy, text: 'Ranking najlepszych traderów' },
              { icon: faComments, text: 'Ekskluzywna społeczność Discord' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(22,219,101,0.15)' }}>
                  <FontAwesomeIcon icon={item.icon} style={{ color: '#16db65', fontSize: '14px' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: '#aaa' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs" style={{ color: '#555' }}>© 2026 The1st Academy Ltd. Wszelkie prawa zastrzeżone.</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src="/the1stacademy_Logo_sygnet.svg" alt="Logo" style={{ width: '32px', height: '32px' }} />
            <span className="font-bold tracking-tight">THE 1ST <span style={{ color: '#16db65' }}>ACADEMY</span></span>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: '#111' }}>Witaj z powrotem</h1>
          <p className="text-sm mb-8" style={{ color: '#888' }}>Zaloguj się do swojego konta</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>EMAIL</label>
              <input
                type="email"
                placeholder="twoj@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={{ borderColor: '#e5e7eb', fontFamily: 'var(--font-montserrat)' }}
                onFocus={e => e.target.style.borderColor = '#16db65'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold" style={{ color: '#555' }}>HASŁO</label>
                <Link href="/reset-password" className="text-xs font-medium" style={{ color: '#16db65' }}>Zapomniałeś hasła?</Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={{ borderColor: '#e5e7eb', fontFamily: 'var(--font-montserrat)' }}
                onFocus={e => e.target.style.borderColor = '#16db65'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            {error && <p className="text-xs font-medium" style={{ color: '#ef4444' }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: '#16db65', fontFamily: 'var(--font-montserrat)' }}
            >
              {loading ? 'Logowanie...' : 'Zaloguj się'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: '#888' }}>
            Nie masz konta?{' '}
            <Link href="/register" className="font-bold" style={{ color: '#16db65' }}>Zarejestruj się</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
