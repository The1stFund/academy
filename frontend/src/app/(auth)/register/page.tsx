'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

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

    if (password !== confirmPassword) {
      setError('Hasła nie są identyczne')
      return
    }

    if (password.length < 8) {
      setError('Hasło musi mieć minimum 8 znaków')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { referral_code: referralCode },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="text-4xl mb-4">✉️</div>
            <CardTitle>Sprawdź swoją skrzynkę</CardTitle>
            <CardDescription>
              Wysłaliśmy email z linkiem potwierdzającym na adres <strong>{email}</strong>.
              Kliknij w link żeby aktywować konto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button variant="outline" className="w-full">Przejdź do logowania</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">The1st Academy</CardTitle>
          <CardDescription>Utwórz konto i zacznij się uczyć</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="twoj@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 znaków"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Powtórz hasło"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referralCode">Kod polecający (opcjonalnie)</Label>
              <Input
                id="referralCode"
                type="text"
                placeholder="Wpisz kod jeśli masz"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Tworzenie konta...' : 'Utwórz konto'}
            </Button>
            <p className="text-center text-sm text-gray-500">
              Masz już konto?{' '}
              <Link href="/login" className="text-black font-medium hover:underline">
                Zaloguj się
              </Link>
            </p>
            <p className="text-center text-xs text-gray-400">
              Rejestrując się akceptujesz nasz{' '}
              <Link href="/terms" className="underline">Regulamin</Link>
              {' '}i{' '}
              <Link href="/privacy" className="underline">Politykę prywatności</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
