'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine, faGraduationCap, faTrophy, faComments } from '@fortawesome/free-solid-svg-icons'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Hasła nie są identyczne'); return }
    if (password.length < 8) { setError('Hasło musi mieć minimum 8 znaków'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { referral_code: referralCode },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: '#f0fdf4' }}>
            <span style={{ fontSize: '32px' }}>✉️</span>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#111' }}>Sprawdź skrzynkę</h1>
          <p className="text-sm mb-8" style={{ color: '#888' }}>
            Wysłaliśmy email z linkiem potwierdzającym na <strong>{email}</strong>. Kliknij w link żeby aktywować konto.
          </p>
          <Link href="/login" className="block w-full py-3.5 rounded-xl font-bold text-sm text-white text-center" style={{ background: '#16db65' }}>
            Przejdź do logowania
          </Link>
        </div>
      </div>
    )
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
            Dołącz do<br />
            <span style={{ color: '#16db65' }}>tysięcy traderów</span>
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

          <h1 className="text-2xl font-bold mb-1" style={{ color: '#111' }}>Utwórz konto</h1>
          <p className="text-sm mb-8" style={{ color: '#888' }}>Zacznij swoją przygodę z tradingiem</p>

          <form onSubmit={handleRegister} className="space-y-4">
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
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>HASŁO</label>
              <input
                type="password"
                placeholder="Min. 8 znaków"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={{ borderColor: '#e5e7eb', fontFamily: 'var(--font-montserrat)' }}
                onFocus={e => e.target.style.borderColor = '#16db65'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>POTWIERDŹ HASŁO</label>
              <input
                type="password"
                placeholder="Powtórz hasło"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all"
                style={{ borderColor: '#e5e7eb', fontFamily: 'var(--font-montserrat)' }}
                onFocus={e => e.target.style.borderColor = '#16db65'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>KOD POLECAJĄCY <span style={{ color: '#aaa', fontWeight: 400 }}>(opcjonalnie)</span></label>
              <input
                type="text"
                placeholder="Wpisz kod jeśli masz"
                value={referralCode}
                onChange={e => setReferralCode(e.target.value)}
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
              {loading ? 'Tworzenie konta...' : 'Utwórz konto'}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: '#aaa' }}>
            Rejestrując się akceptujesz nasz{' '}
            <Link href="/terms" className="underline" style={{ color: '#888' }}>Regulamin</Link>
            {' '}i{' '}
            <Link href="/privacy" className="underline" style={{ color: '#888' }}>Politykę prywatności</Link>
          </p>

          <p className="text-center text-sm mt-4" style={{ color: '#888' }}>
            Masz już konto?{' '}
            <Link href="/login" className="font-bold" style={{ color: '#16db65' }}>Zaloguj się</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
