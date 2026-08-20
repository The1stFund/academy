'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faHome, faGraduationCap, faChartLine, faTrophy, faHandshake, faUser, faArrowRightFromBracket, faChevronRight, faEnvelope, faCalendar, faCrown, faEdit, faCheck, faPlus, faDownload, faTrash , faBook } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'

type UserData = { id: string; email: string; role: string; full_name?: string; created_at?: string }
type Subscription = { status: string; current_period_end: string; plan_id: string }
type MT4Account = { id: string; account_number: string; label: string }

const EA_FILENAME = 'The 1ST Hand Trader 20260806.ex4'
const EA_PATH = 'hand-trader/' + EA_FILENAME

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [mt4Accounts, setMt4Accounts] = useState<MT4Account[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [newAccount, setNewAccount] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [addingAccount, setAddingAccount] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [downloadingLicense, setDownloadingLicense] = useState<string | null>(null)
  const [downloadingEA, setDownloadingEA] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: coreUser } = await supabase.schema('core').from('users').select('id, email, role, created_at').eq('auth_user_id', session.user.id).single()
    if (coreUser) {
      const { data: profile } = await supabase.schema('core').from('profiles').select('full_name').eq('user_id', coreUser.id).single()
      setUser({ ...coreUser, full_name: profile?.full_name })
      setFullName(profile?.full_name || '')
      const { data: sub } = await supabase.schema('payments').from('subscriptions').select('status, current_period_end, plan_id').eq('user_id', coreUser.id).eq('status', 'active').single()
      if (sub) setSubscription(sub)
      const { data: accounts } = await supabase.schema('trading').from('mt4_accounts').select('*').eq('user_id', coreUser.id).order('created_at', { ascending: true })
      if (accounts) setMt4Accounts(accounts)
    }
    setLoading(false)
  }

  async function saveName() {
    if (!user) return
    setSaving(true)
    await supabase.schema('core').from('profiles').upsert({ user_id: user.id, full_name: fullName }, { onConflict: 'user_id' })
    setUser({ ...user, full_name: fullName })
    setSaving(false)
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function addMT4Account() {
    if (!user || !newAccount.trim()) return
    if (mt4Accounts.length >= 3) return
    setAddingAccount(true)
    const { data, error } = await supabase.schema('trading').from('mt4_accounts').insert({
      user_id: user.id,
      account_number: newAccount.trim(),
      label: newLabel.trim() || null,
    }).select().single()
    if (!error && data) {
      setMt4Accounts([...mt4Accounts, data])
      setNewAccount('')
      setNewLabel('')
      setShowAddForm(false)
    }
    setAddingAccount(false)
  }

  async function removeAccount(id: string) {
    if (!confirm('Usunąć to konto MT4?')) return
    await supabase.schema('trading').from('mt4_accounts').delete().eq('id', id)
    setMt4Accounts(mt4Accounts.filter(a => a.id !== id))
  }

  async function downloadLicense(accountNumber: string) {
    if (!user) return
    setDownloadingLicense(accountNumber)
    const res = await fetch('/api/licenses/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mt4_account: accountNumber, user_id: user.id }),
    })
    if (res.ok) {
      const blob = await res.blob()
      const filename = 'license_' + accountNumber + '.dat'
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
    } else {
      alert('Błąd generowania licencji. Sprawdź czy masz aktywną subskrypcję.')
    }
    setDownloadingLicense(null)
  }

  async function downloadEA() {
    setDownloadingEA(true)
    const res = await fetch('/api/ea/download')
    const data = await res.json()
    if (data.url) {
      const a = document.createElement('a')
      a.href = data.url
      a.download = EA_FILENAME
      a.click()
    } else {
      alert('Błąd pobierania pliku EA.')
    }
    setDownloadingEA(false)
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push('/') }

  function formatDate(d: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const navItems = [
    { icon: faHome, label: 'Dashboard', href: '/dashboard' },
    { icon: faGraduationCap, label: 'Kursy', href: '/courses' },
    { icon: faChartLine, label: 'Analizy rynku', href: '/analysis' },
    { icon: faTrophy, label: 'Leaderboard', href: '/leaderboard' },
    { icon: faBook, label: 'Dziennik', href: '/journal' },
    { icon: faHandshake, label: 'Program afiliacyjny', href: '/affiliate' },
    { icon: faUser, label: 'Profil', href: '/profile', active: true },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#16db65', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0" style={{ background: '#111' }}>
        <div className="px-6 py-6 border-b" style={{ borderColor: '#222' }}>
          <Link href="/dashboard" className="flex items-center gap-3">
            <img src="/the1stacademy_Logo_sygnet_white.svg" alt="Logo" style={{ width: '32px', height: '32px' }} />
            <span className="text-white font-bold text-sm tracking-tight">THE 1ST <span style={{ color: '#16db65' }}>ACADEMY</span></span>
          </Link>
        </div>
        <div className="px-4 py-4 border-b" style={{ borderColor: '#222' }}>
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: '#16db65', color: '#111' }}>
              {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'Student'}</p>
              <p className="text-xs truncate" style={{ color: '#666' }}>{user?.email}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map(item => (
            <Link key={item.label} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
              style={{ background: (item as any).active ? 'rgba(22,219,101,0.1)' : 'transparent', color: (item as any).active ? '#16db65' : '#aaa' }}
            >
              <FontAwesomeIcon icon={item.icon} style={{ fontSize: '14px', width: '16px' }} />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '10px', color: '#444' }} />
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t" style={{ borderColor: '#222' }}>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full hover:bg-white/5" style={{ color: '#666' }}>
            <FontAwesomeIcon icon={faArrowRightFromBracket} style={{ fontSize: '14px', width: '16px' }} />
            <span className="text-sm font-medium">Wyloguj się</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 overflow-auto">
        <div className="px-8 py-8 max-w-2xl space-y-4">
          <div className="mb-2">
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#111' }}>Profil</h1>
            <p className="text-sm" style={{ color: '#888' }}>Zarządzaj swoim kontem i subskrypcją</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#f0f0f0' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm" style={{ color: '#111' }}>Dane osobowe</h2>
              {!editing && (
                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border" style={{ color: '#888', borderColor: '#e5e7eb' }}>
                  <FontAwesomeIcon icon={faEdit} style={{ fontSize: '11px' }} /> Edytuj
                </button>
              )}
              {saved && <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#16db65' }}><FontAwesomeIcon icon={faCheck} style={{ fontSize: '11px' }} /> Zapisano</div>}
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0" style={{ background: '#f0fdf4', color: '#16db65' }}>
                {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold" style={{ color: '#111' }}>{user?.full_name || 'Brak nazwy'}</p>
                <p className="text-sm" style={{ color: '#888' }}>{user?.email}</p>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block" style={{ background: '#f0fdf4', color: '#16db65' }}>{user?.role}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>IMIĘ I NAZWISKO</label>
                {editing ? (
                  <div className="flex gap-2">
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none" style={{ borderColor: '#16db65' }} placeholder="Wpisz imię i nazwisko" />
                    <button onClick={saveName} disabled={saving} className="px-4 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#16db65' }}>{saving ? '...' : 'Zapisz'}</button>
                    <button onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-xl text-sm border" style={{ borderColor: '#e5e7eb', color: '#888' }}>Anuluj</button>
                  </div>
                ) : (
                  <p className="text-sm px-4 py-2.5 rounded-xl" style={{ background: '#f9f9f9', color: '#111' }}>{user?.full_name || '—'}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>EMAIL</label>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#f9f9f9' }}>
                  <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: '13px', color: '#aaa' }} />
                  <p className="text-sm" style={{ color: '#111' }}>{user?.email}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>CZŁONEK OD</label>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#f9f9f9' }}>
                  <FontAwesomeIcon icon={faCalendar} style={{ fontSize: '13px', color: '#aaa' }} />
                  <p className="text-sm" style={{ color: '#111' }}>{formatDate(user?.created_at || '')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#f0f0f0' }}>
            <h2 className="font-bold text-sm mb-4" style={{ color: '#111' }}>Subskrypcja</h2>
            {subscription ? (
              <div>
                <div className="flex items-center gap-3 p-4 rounded-xl mb-4" style={{ background: '#f0fdf4' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#16db65' }}>
                    <FontAwesomeIcon icon={faCrown} style={{ color: 'white', fontSize: '16px' }} />
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#111' }}>The1st Academy</p>
                    <p className="text-xs" style={{ color: '#16db65' }}>Aktywna subskrypcja</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs" style={{ color: '#888' }}>Aktywna do</p>
                    <p className="text-sm font-bold" style={{ color: '#111' }}>{formatDate(subscription.current_period_end)}</p>
                  </div>
                </div>
                <p className="text-xs" style={{ color: '#aaa' }}>Aby anulować subskrypcję skontaktuj się z nami przez Discord lub email.</p>
              </div>
            ) : (
              <div>
                <p className="text-sm mb-4" style={{ color: '#888' }}>Nie masz aktywnej subskrypcji.</p>
                <Link href="/pricing" className="inline-block px-5 py-2.5 rounded-xl font-bold text-sm text-white" style={{ background: '#16db65' }}>Kup subskrypcję – £49/msc</Link>
              </div>
            )}
          </div>

          {subscription && (
            <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#f0f0f0' }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="font-bold text-sm" style={{ color: '#111' }}>The 1ST Hand Trader</h2>
                  <p className="text-xs mt-0.5" style={{ color: '#888' }}>Narzędzie do ręcznego tradingu z ochroną konta</p>
                </div>
                <button onClick={downloadEA} disabled={downloadingEA}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white disabled:opacity-60"
                  style={{ background: '#111' }}>
                  <FontAwesomeIcon icon={faDownload} style={{ fontSize: '12px' }} />
                  {downloadingEA ? 'Pobieranie...' : 'Pobierz EA'}
                </button>
              </div>

              <div className="mt-4 p-4 rounded-xl mb-4" style={{ background: '#f9f9f9' }}>
                <p className="text-xs font-bold mb-2" style={{ color: '#555' }}>INSTRUKCJA INSTALACJI</p>
                <ol className="text-xs space-y-1.5" style={{ color: '#888' }}>
                  <li>1. Pobierz plik EA powyżej (.ex4)</li>
                  <li>2. W MT4: <strong>Plik → Otwórz folder danych → MQL4 → Experts</strong></li>
                  <li>3. Wklej plik .ex4 do tego folderu</li>
                  <li>4. Pobierz licencję dla swojego konta MT4 poniżej</li>
                  <li>5. Wklej plik licencji do folderu <strong>MQL4 → Files</strong></li>
                  <li>6. Zrestartuj MT4 i dodaj EA na wykres</li>
                </ol>
              </div>

              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold" style={{ color: '#555' }}>TWOJE KONTA MT4 ({mt4Accounts.length}/3)</p>
                {mt4Accounts.length < 3 && (
                  <button onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg"
                    style={{ background: '#f0fdf4', color: '#16db65' }}>
                    <FontAwesomeIcon icon={faPlus} style={{ fontSize: '10px' }} /> Dodaj konto
                  </button>
                )}
              </div>

              {showAddForm && (
                <div className="p-4 rounded-xl mb-3" style={{ background: '#f9f9f9' }}>
                  <div className="space-y-2">
                    <input type="text" value={newAccount} onChange={e => setNewAccount(e.target.value)}
                      placeholder="Numer konta MT4 (np. 1234567)"
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: '#e5e7eb' }} />
                    <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                      placeholder="Etykieta (opcjonalnie, np. Demo, Real)"
                      className="w-full px-3 py-2 rounded-lg border text-sm outline-none" style={{ borderColor: '#e5e7eb' }} />
                    <div className="flex gap-2">
                      <button onClick={addMT4Account} disabled={addingAccount || !newAccount.trim()}
                        className="px-4 py-2 rounded-lg font-bold text-sm text-white disabled:opacity-60"
                        style={{ background: '#16db65' }}>
                        {addingAccount ? '...' : 'Dodaj'}
                      </button>
                      <button onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: '#e5e7eb', color: '#888' }}>
                        Anuluj
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {mt4Accounts.length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: '#aaa' }}>Dodaj swoje konto MT4 aby pobrać licencję</p>
              ) : (
                <div className="space-y-2">
                  {mt4Accounts.map(account => (
                    <div key={account.id} className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: '#f0f0f0' }}>
                      <div>
                        <p className="text-sm font-bold font-mono" style={{ color: '#111' }}>{account.account_number}</p>
                        {account.label && <p className="text-xs" style={{ color: '#888' }}>{account.label}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => downloadLicense(account.account_number)}
                          disabled={downloadingLicense === account.account_number}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs text-white disabled:opacity-60"
                          style={{ background: '#16db65' }}>
                          <FontAwesomeIcon icon={faDownload} style={{ fontSize: '10px' }} />
                          {downloadingLicense === account.account_number ? '...' : 'Pobierz licencję'}
                        </button>
                        <button onClick={() => removeAccount(account.id)}
                          className="p-1.5 rounded-lg" style={{ color: '#ccc' }}>
                          <FontAwesomeIcon icon={faTrash} style={{ fontSize: '12px' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
