'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type License = {
  id: string
  mt4_account: string
  expiry: string
  filename: string
  is_universal: boolean
  generated_by: string
  created_at: string
}

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [mt4Account, setMt4Account] = useState('')
  const [expiry, setExpiry] = useState('')
  const [universal, setUniversal] = useState(false)
  const [neverExpires, setNeverExpires] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadLicenses()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
  }

  async function loadLicenses() {
    const { data } = await supabase
      .schema('trading')
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setLicenses(data)
    setLoading(false)
  }

  async function generateLicense() {
    if (!universal && !mt4Account.trim()) {
      setMessage('Podaj numer konta MT4')
      return
    }
    if (!neverExpires && !expiry) {
      setMessage('Podaj datę ważności lub zaznacz bezterminowo')
      return
    }

    setGenerating(true)
    setMessage('')

    let expiryStr = 'NEVER'
    if (!neverExpires && expiry) {
      const d = new Date(expiry)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      expiryStr = yyyy + '.' + mm + '.' + dd + ' 23:59'
    }

    const res = await fetch('/api/licenses/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mt4_account: mt4Account.trim(),
        expiry: expiryStr,
        universal,
        never_expires: neverExpires,
        mode: 'admin',
      }),
    })

    if (res.ok) {
      const blob = await res.blob()
      const filename = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') || 'license.dat'
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
      setMessage('Licencja wygenerowana i pobrana!')
      loadLicenses()
    } else {
      const data = await res.json()
      setMessage('Błąd: ' + (data.error || 'Nieznany błąd'))
    }

    setGenerating(false)
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-500 hover:text-black">← Wróć</button>
        <h1 className="text-xl font-bold">Licencje Hand Trader</h1>
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-6">

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <h2 className="font-bold text-base mb-4">Generuj nową licencję</h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="universal"
                checked={universal}
                onChange={e => setUniversal(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="universal" className="text-sm font-medium">Licencja uniwersalna (license_open.dat – działa na każdym koncie)</label>
            </div>

            {!universal && (
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-500">NUMER KONTA MT4</label>
                <input
                  type="text"
                  value={mt4Account}
                  onChange={e => setMt4Account(e.target.value)}
                  placeholder="np. 1234567"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none border-gray-200"
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="neverExpires"
                checked={neverExpires}
                onChange={e => setNeverExpires(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="neverExpires" className="text-sm font-medium">Bezterminowo (NEVER)</label>
            </div>

            {!neverExpires && (
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-gray-500">DATA WAŻNOŚCI</label>
                <input
                  type="date"
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none border-gray-200"
                />
              </div>
            )}

            {message && (
              <p className="text-sm font-medium" style={{ color: message.startsWith('Błąd') ? '#ef4444' : '#16db65' }}>
                {message}
              </p>
            )}

            <button
              onClick={generateLicense}
              disabled={generating}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60"
              style={{ background: '#16db65' }}
            >
              {generating ? 'Generowanie...' : 'Generuj i pobierz licencję'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-base">Historia licencji ({licenses.length})</h2>
          </div>
          {loading ? (
            <p className="text-sm text-gray-400 p-6">Ładowanie...</p>
          ) : licenses.length === 0 ? (
            <p className="text-sm text-gray-400 p-6 text-center">Brak wygenerowanych licencji</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400">PLIK</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400">KONTO MT4</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400">WAŻNOŚĆ</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400">TYP</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-400">DATA</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map(lic => (
                  <tr key={lic.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs text-gray-600">{lic.filename}</td>
                    <td className="px-6 py-3 font-mono">{lic.mt4_account}</td>
                    <td className="px-6 py-3">{lic.expiry}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: lic.is_universal ? '#f0fdf4' : '#f5f5f5', color: lic.is_universal ? '#16db65' : '#888' }}>
                        {lic.is_universal ? 'Uniwersalna' : 'Studencka'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-400 text-xs">{formatDate(lic.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </main>
    </div>
  )
}
