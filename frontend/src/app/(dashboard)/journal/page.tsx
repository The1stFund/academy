'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGraduationCap, faChartLine, faTrophy, faHandshake, faUser, faArrowRightFromBracket, faChevronRight, faPlus, faEdit, faTrash, faBook, faChartBar, faHome } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'

type JournalEntry = {
  id: string
  trade_date: string
  trade_time: string
  sr_level: string
  setup: string
  entry: string
  exit: string
  risk_percent: number
  emotion_score: number
  notes: string
  created_at: string
}

type WeeklyJournal = {
  id?: string
  week_start: string
  trades_with_plan: number
  emotion_notes: string
  sr_notes: string
  general_notes: string
}

const EMPTY_ENTRY = {
  trade_date: new Date().toISOString().split('T')[0],
  trade_time: '14:30',
  sr_level: '',
  setup: '',
  entry: '',
  exit: '',
  risk_percent: 1,
  emotion_score: 5,
  notes: '',
}

const EMOTION_LABELS: Record<number, string> = {
  1: 'Bardzo spokojny', 2: 'Spokojny', 3: 'Lekki stres', 4: 'Umiarkowany stres',
  5: 'Neutralny', 6: 'Lekki FOMO', 7: 'FOMO', 8: 'Silny FOMO', 9: 'Panika', 10: 'Pelna panika'
}

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.getFullYear(), d.getMonth(), diff).toISOString().split('T')[0]
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<{ email: string; full_name?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'entries' | 'weekly'>('entries')
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [form, setForm] = useState(EMPTY_ENTRY)
  const [saving, setSaving] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [filterDate, setFilterDate] = useState('')
  const [analyses, setAnalyses] = useState<Record<string, string>>({})
  const [generatingWeeklySummary, setGeneratingWeeklySummary] = useState(false)
  const [weeklySummary, setWeeklySummary] = useState('')
  const [weeklyForm, setWeeklyForm] = useState<WeeklyJournal>({
    week_start: getWeekStart(new Date()),
    trades_with_plan: 0,
    emotion_notes: '',
    sr_notes: '',
    general_notes: '',
  })
  const [savingWeekly, setSavingWeekly] = useState(false)
  const [weeklySaved, setWeeklySaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: coreUser } = await supabase.schema('core').from('users').select('id, email').eq('auth_user_id', session.user.id).single()
    if (coreUser) {
      const { data: profile } = await supabase.schema('core').from('profiles').select('full_name').eq('user_id', coreUser.id).single()
      setUser({ email: coreUser.email, full_name: profile?.full_name })
      setUserId(coreUser.id)
      const { data: entriesData } = await supabase.schema('trading').from('journal_entries').select('*').eq('user_id', coreUser.id).order('trade_date', { ascending: false }).order('trade_time', { ascending: false })
      if (entriesData) {
        setEntries(entriesData)
        const savedAnalyses: Record<string, string> = {}
        entriesData.forEach(e => { if (e.ai_analysis) savedAnalyses[e.id] = e.ai_analysis })
        setAnalyses(savedAnalyses)
      }
      const { data: weeklyData } = await supabase.schema('trading').from('journal_weekly').select('*').eq('user_id', coreUser.id).eq('week_start', getWeekStart(new Date())).single()
      if (weeklyData) {
        setWeeklyForm(weeklyData)
        if (weeklyData.ai_summary) setWeeklySummary(weeklyData.ai_summary)
      }
    }
    setLoading(false)
  }

  async function saveEntry() {
    if (!userId) return
    setSaving(true)
    if (editingEntry) {
      const { error } = await supabase.schema('trading').from('journal_entries').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editingEntry.id)
      if (!error) setEntries(entries.map(e => e.id === editingEntry.id ? { ...editingEntry, ...form } : e))
    } else {
      const { data, error } = await supabase.schema('trading').from('journal_entries').insert({ ...form, user_id: userId }).select().single()
      if (!error && data) setEntries([data, ...entries])
    }
    setForm(EMPTY_ENTRY)
    setEditingEntry(null)
    setShowForm(false)
    setSaving(false)
  }

  async function deleteEntry(id: string) {
    if (!confirm('Usunac ten wpis?')) return
    await supabase.schema('trading').from('journal_entries').delete().eq('id', id)
    setEntries(entries.filter(e => e.id !== id))
  }

  async function analyzeEntry(entry: JournalEntry) {
    setAnalyzingId(entry.id)
    const res = await fetch('https://cosrhfdobsfdbxeemzyx.supabase.co/functions/v1/analyze-trade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ entry }),
    })
    const data = await res.json()
    if (data.analysis) {
      setAnalyses(prev => ({ ...prev, [entry.id]: data.analysis }))
      await supabase.schema('trading').from('journal_entries').update({ ai_analysis: data.analysis }).eq('id', entry.id)
    }
    setAnalyzingId(null)
  }

  async function generateWeeklySummary() {
    setGeneratingWeeklySummary(true)
    const weekEntries = entries.filter(e => {
      const entryDate = new Date(e.trade_date)
      const weekStartDate = new Date(weeklyForm.week_start)
      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekEndDate.getDate() + 7)
      return entryDate >= weekStartDate && entryDate < weekEndDate
    })
    const res = await fetch('https://cosrhfdobsfdbxeemzyx.supabase.co/functions/v1/weekly-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ weekly: weeklyForm, entries: weekEntries }),
    })
    const data = await res.json()
    if (data.summary) {
      setWeeklySummary(data.summary)
      if (userId) {
        await supabase.schema('trading').from('journal_weekly').upsert(
          { ...weeklyForm, user_id: userId, ai_summary: data.summary },
          { onConflict: 'user_id,week_start' }
        )
      }
    }
    setGeneratingWeeklySummary(false)
  }

  async function saveWeekly() {
    if (!userId) return
    setSavingWeekly(true)
    await supabase.schema('trading').from('journal_weekly').upsert({ ...weeklyForm, user_id: userId }, { onConflict: 'user_id,week_start' })
    setSavingWeekly(false)
    setWeeklySaved(true)
    setTimeout(() => setWeeklySaved(false), 2000)
  }

  function startEdit(entry: JournalEntry) {
    setEditingEntry(entry)
    setForm({
      trade_date: entry.trade_date,
      trade_time: entry.trade_time,
      sr_level: entry.sr_level,
      setup: entry.setup,
      entry: entry.entry,
      exit: entry.exit,
      risk_percent: entry.risk_percent,
      emotion_score: entry.emotion_score,
      notes: entry.notes,
    })
    setShowForm(true)
  }

  const navItems = [
    { icon: faHome, label: 'Dashboard', href: '/dashboard' },
    { icon: faGraduationCap, label: 'Kursy', href: '/courses' },
    { icon: faChartLine, label: 'Analizy rynku', href: '/analysis' },
    { icon: faBook, label: 'Dziennik', href: '/journal', active: true },
    { icon: faTrophy, label: 'Leaderboard', href: '/leaderboard' },
    { icon: faHandshake, label: 'Program afiliacyjny', href: '/affiliate' },
    { icon: faUser, label: 'Profil', href: '/profile' },
  ]

  async function handleLogout() { await supabase.auth.signOut(); router.push('/') }

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
            <span className="text-sm font-medium">Wyloguj sie</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 overflow-auto">
        <div className="px-8 py-8 max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: '#111' }}>Dziennik Tradera</h1>
              <p className="text-sm" style={{ color: '#888' }}>{entries.length} wpisow</p>
            </div>
            {activeTab === 'entries' && (
              <button onClick={() => { setShowForm(true); setEditingEntry(null); setForm(EMPTY_ENTRY) }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white"
                style={{ background: '#16db65' }}>
                <FontAwesomeIcon icon={faPlus} style={{ fontSize: '12px' }} />
                Dodaj wpis
              </button>
            )}
          </div>

          <div className="flex gap-2 mb-6">
            {[
              { key: 'entries', label: 'Wpisy', icon: faBook },
              { key: 'weekly', label: 'Autoanaliza tygodniowa', icon: faChartBar },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: activeTab === tab.key ? '#16db65' : 'white', color: activeTab === tab.key ? 'white' : '#888', border: '1px solid ' + (activeTab === tab.key ? '#16db65' : '#e5e7eb') }}>
                <FontAwesomeIcon icon={tab.icon} style={{ fontSize: '12px' }} />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'entries' && (
            <div className="space-y-4">
              {showForm && (
                <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#f0f0f0' }}>
                  <h2 className="font-bold text-sm mb-4" style={{ color: '#111' }}>
                    {editingEntry ? 'Edytuj wpis' : 'Nowy wpis'}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>DATA</label>
                      <input type="date" value={form.trade_date} onChange={e => setForm({ ...form, trade_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={{ borderColor: '#e5e7eb' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>GODZINA</label>
                      <input type="time" value={form.trade_time} onChange={e => setForm({ ...form, trade_time: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={{ borderColor: '#e5e7eb' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>S/R</label>
                      <input type="text" value={form.sr_level} onChange={e => setForm({ ...form, sr_level: e.target.value })}
                        placeholder="np. opor: 3209"
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={{ borderColor: '#e5e7eb' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>RYZYKO %</label>
                      <input type="number" value={form.risk_percent} onChange={e => setForm({ ...form, risk_percent: parseFloat(e.target.value) })}
                        step="0.1" min="0" max="100"
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={{ borderColor: '#e5e7eb' }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>SETUP</label>
                      <input type="text" value={form.setup} onChange={e => setForm({ ...form, setup: e.target.value })}
                        placeholder="np. zamkniecie 30M ponizej wsparcia"
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={{ borderColor: '#e5e7eb' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>WEJSCIE</label>
                      <input type="text" value={form.entry} onChange={e => setForm({ ...form, entry: e.target.value })}
                        placeholder="np. sell: 3200"
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={{ borderColor: '#e5e7eb' }} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>WYJSCIE</label>
                      <input type="text" value={form.exit} onChange={e => setForm({ ...form, exit: e.target.value })}
                        placeholder="np. TP: 3194"
                        className="w-full px-3 py-2 rounded-xl border text-sm outline-none" style={{ borderColor: '#e5e7eb' }} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>
                      EMOCJE: {form.emotion_score}/10 - {EMOTION_LABELS[form.emotion_score]}
                    </label>
                    <input type="range" min="1" max="10" value={form.emotion_score}
                      onChange={e => setForm({ ...form, emotion_score: parseInt(e.target.value) })}
                      className="w-full" style={{ accentColor: '#16db65' }} />
                    <div className="flex justify-between text-xs mt-1" style={{ color: '#aaa' }}>
                      <span>1 - Spokoj</span>
                      <span>10 - Panika</span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>WNIOSKI</label>
                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="Co zaobserwowales? Co mozesz poprawic?"
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none" rows={3} style={{ borderColor: '#e5e7eb' }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEntry} disabled={saving}
                      className="px-5 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60"
                      style={{ background: '#16db65' }}>
                      {saving ? 'Zapisywanie...' : editingEntry ? 'Zapisz zmiany' : 'Dodaj wpis'}
                    </button>
                    <button onClick={() => { setShowForm(false); setEditingEntry(null) }}
                      className="px-5 py-2.5 rounded-xl text-sm border" style={{ borderColor: '#e5e7eb', color: '#888' }}>
                      Anuluj
                    </button>
                  </div>
                </div>
              )}

              {entries.length === 0 && !showForm ? (
                <div className="bg-white rounded-2xl p-12 border text-center" style={{ borderColor: '#f0f0f0' }}>
                  <FontAwesomeIcon icon={faBook} style={{ fontSize: '32px', color: '#e5e7eb', marginBottom: '12px' }} />
                  <p className="font-bold mb-1" style={{ color: '#111' }}>Brak wpisow</p>
                  <p className="text-sm mb-4" style={{ color: '#888' }}>Zacznij prowadzic swoj dziennik tradera</p>
                  <button onClick={() => setShowForm(true)}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm text-white"
                    style={{ background: '#16db65' }}>
                    Dodaj pierwszy wpis
                  </button>
                </div>
              ) : entries.length > 0 ? (
                <div className="space-y-3">
                  <div className="bg-white rounded-2xl border p-4 flex items-center gap-3" style={{ borderColor: '#f0f0f0' }}>
                    <label className="text-xs font-semibold" style={{ color: '#555' }}>FILTRUJ PO DACIE:</label>
                    <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border text-sm outline-none" style={{ borderColor: '#e5e7eb' }} />
                    {filterDate && (
                      <button onClick={() => setFilterDate('')} className="text-xs px-3 py-1.5 rounded-xl" style={{ color: '#888', background: '#f5f5f5' }}>
                        Wyczyść
                      </button>
                    )}
                    <span className="text-xs ml-auto" style={{ color: '#aaa' }}>
                      {entries.filter(e => !filterDate || e.trade_date === filterDate).length} wpisów
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#f0f0f0' }}>
                    <div className="grid grid-cols-12 px-4 py-2 border-b text-xs font-bold" style={{ background: '#fafafa', borderColor: '#f0f0f0', color: '#aaa' }}>
                      <div className="col-span-2">DATA</div>
                      <div className="col-span-1">GODZ.</div>
                      <div className="col-span-2">S/R</div>
                      <div className="col-span-3">SETUP</div>
                      <div className="col-span-1">RYZYKO</div>
                      <div className="col-span-1">EMOCJE</div>
                      <div className="col-span-1">AI</div>
                      <div className="col-span-1"></div>
                    </div>
                    {entries.filter(e => !filterDate || e.trade_date === filterDate).map(entry => (
                      <React.Fragment key={entry.id}>
                        <div
                          className="grid grid-cols-12 px-4 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors items-center"
                          style={{ borderColor: '#f5f5f5' }}
                          onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                        >
                          <div className="col-span-2 text-xs font-semibold" style={{ color: '#111' }}>{entry.trade_date}</div>
                          <div className="col-span-1 text-xs" style={{ color: '#888' }}>{entry.trade_time?.slice(0,5)}</div>
                          <div className="col-span-2 text-xs truncate" style={{ color: '#555' }}>{entry.sr_level || '-'}</div>
                          <div className="col-span-3 text-xs truncate" style={{ color: '#555' }}>{entry.setup || '-'}</div>
                          <div className="col-span-1">
                            <span className="text-xs font-bold" style={{ color: '#16db65' }}>{entry.risk_percent}%</span>
                          </div>
                          <div className="col-span-1">
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                              style={{ background: entry.emotion_score <= 4 ? '#f0fdf4' : entry.emotion_score <= 7 ? '#fff7ed' : '#fef2f2', color: entry.emotion_score <= 4 ? '#16db65' : entry.emotion_score <= 7 ? '#ea580c' : '#dc2626' }}>
                              {entry.emotion_score}/10
                            </span>
                          </div>
                          <div className="col-span-1 text-center">
                            {analyses[entry.id] ? <span style={{ color: '#16db65' }}>🤖</span> : <span style={{ color: '#ddd' }}>🤖</span>}
                          </div>
                          <div className="col-span-1 text-right">
                            <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '10px', color: '#ccc', transform: expandedEntry === entry.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                          </div>
                        </div>

                        {expandedEntry === entry.id && (
                          <div className="px-4 pb-4 border-b" style={{ borderColor: '#f5f5f5', background: '#fafafa' }}>
                            <div className="grid grid-cols-3 gap-3 mt-3 mb-3">
                              <div className="p-2.5 rounded-xl bg-white border" style={{ borderColor: '#f0f0f0' }}>
                                <p className="text-xs font-semibold mb-0.5" style={{ color: '#aaa' }}>SETUP</p>
                                <p className="text-sm" style={{ color: '#111' }}>{entry.setup || '-'}</p>
                              </div>
                              <div className="p-2.5 rounded-xl bg-white border" style={{ borderColor: '#f0f0f0' }}>
                                <p className="text-xs font-semibold mb-0.5" style={{ color: '#aaa' }}>WEJSCIE</p>
                                <p className="text-sm font-mono" style={{ color: '#111' }}>{entry.entry || '-'}</p>
                              </div>
                              <div className="p-2.5 rounded-xl bg-white border" style={{ borderColor: '#f0f0f0' }}>
                                <p className="text-xs font-semibold mb-0.5" style={{ color: '#aaa' }}>WYJSCIE</p>
                                <p className="text-sm font-mono" style={{ color: '#111' }}>{entry.exit || '-'}</p>
                              </div>
                            </div>
                            {entry.notes && (
                              <div className="mb-3 p-2.5 rounded-xl bg-white border" style={{ borderColor: '#f0f0f0' }}>
                                <p className="text-xs font-semibold mb-0.5" style={{ color: '#aaa' }}>WNIOSKI</p>
                                <p className="text-sm leading-relaxed" style={{ color: '#555' }}>{entry.notes}</p>
                              </div>
                            )}
                            {analyses[entry.id] && (
                              <div className="mb-3 rounded-xl p-3" style={{ background: '#f0fdf4' }}>
                                <p className="font-bold text-xs mb-1.5" style={{ color: '#16db65' }}>🤖 ANALIZA AI MENTORA</p>
                                <p className="text-sm leading-relaxed" style={{ color: '#166534', whiteSpace: 'pre-wrap' }}>{analyses[entry.id]}</p>
                              </div>
                            )}
                            <div className="flex gap-2">
                              {!analyses[entry.id] ? (
                                <button onClick={(e) => { e.stopPropagation(); analyzeEntry(entry) }} disabled={analyzingId === entry.id}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
                                  style={{ background: '#f0fdf4', color: '#16db65' }}>
                                  {analyzingId === entry.id ? 'Analizowanie...' : '🤖 Analiza AI'}
                                </button>
                              ) : (
                                <button onClick={async (e) => {
                                  e.stopPropagation()
                                  setAnalyses(prev => { const n = {...prev}; delete n[entry.id]; return n })
                                  await supabase.schema('trading').from('journal_entries').update({ ai_analysis: null }).eq('id', entry.id)
                                }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                                  style={{ background: '#fef2f2', color: '#ef4444' }}>
                                  🗑️ Usuń analizę AI
                                </button>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); startEdit(entry) }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: '#e5e7eb', color: '#888' }}>
                                <FontAwesomeIcon icon={faEdit} style={{ fontSize: '11px' }} /> Edytuj
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); deleteEntry(entry.id) }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ color: '#ccc' }}>
                                <FontAwesomeIcon icon={faTrash} style={{ fontSize: '11px' }} /> Usuń
                              </button>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'weekly' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#f0f0f0' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-sm" style={{ color: '#111' }}>Autoanaliza tygodniowa</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: '#888' }}>Tydzien od: {weeklyForm.week_start}</span>
                    {weeklySaved && <span className="text-xs font-medium" style={{ color: '#16db65' }}>Zapisano</span>}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>
                      ILE TRANSAKCJI BYLO ZGODNYCH Z PLANEM? (zamkniecie swiecy 30M, ryzyko 1%)
                    </label>
                    <div className="flex items-center gap-3">
                      <input type="number" value={weeklyForm.trades_with_plan} min="0"
                        onChange={e => setWeeklyForm({ ...weeklyForm, trades_with_plan: parseInt(e.target.value) || 0 })}
                        className="w-24 px-3 py-2 rounded-xl border text-sm outline-none" style={{ borderColor: '#e5e7eb' }} />
                      <span className="text-sm" style={{ color: '#888' }}>transakcji zgodnych z planem</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>
                      CZY I KIEDY EMOCJE (NP. FOMO) PRZEJELY KONTROLE?
                    </label>
                    <textarea value={weeklyForm.emotion_notes} onChange={e => setWeeklyForm({ ...weeklyForm, emotion_notes: e.target.value })}
                      placeholder="Opisz sytuacje gdy emocje wplynely na Twoje decyzje..."
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none" rows={3} style={{ borderColor: '#e5e7eb' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>
                      JAKIE POZIOMY S/R Z 30M/H1/H4 BYLY NAJSKUTECZNIEJSZE?
                    </label>
                    <textarea value={weeklyForm.sr_notes} onChange={e => setWeeklyForm({ ...weeklyForm, sr_notes: e.target.value })}
                      placeholder="Ktore strefy zadzialaly najlepiej?"
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none" rows={3} style={{ borderColor: '#e5e7eb' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#555' }}>
                      OGOLNE WNIOSKI Z TYGODNIA
                    </label>
                    <textarea value={weeklyForm.general_notes} onChange={e => setWeeklyForm({ ...weeklyForm, general_notes: e.target.value })}
                      placeholder="Co chcesz poprawic w przyszlym tygodniu?"
                      className="w-full px-3 py-2 rounded-xl border text-sm outline-none resize-none" rows={4} style={{ borderColor: '#e5e7eb' }} />
                  </div>
                  <div className="flex gap-2">
                    {weeklySummary && (
                      <button onClick={async () => {
                        setWeeklySummary('')
                        if (userId) {
                          await supabase.schema('trading').from('journal_weekly').upsert(
                            { ...weeklyForm, user_id: userId, ai_summary: null },
                            { onConflict: 'user_id,week_start' }
                          )
                        }
                      }} className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium"
                        style={{ background: '#fef2f2', color: '#ef4444' }}>
                        🗑️ Usuń podsumowanie AI
                      </button>
                    )}
                    <button onClick={generateWeeklySummary} disabled={generatingWeeklySummary}
                      className="px-5 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60"
                      style={{ background: '#111' }}>
                      {generatingWeeklySummary ? 'Generowanie...' : '🤖 Podsumowanie AI'}
                    </button>
                    <button onClick={saveWeekly} disabled={savingWeekly}
                      className="px-5 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-60"
                      style={{ background: '#16db65' }}>
                      {savingWeekly ? 'Zapisywanie...' : 'Zapisz autoanalzye'}
                    </button>
                  </div>
                </div>
              </div>

              {weeklySummary && (
                <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#f0f0f0' }}>
                  <h3 className="font-bold text-sm mb-3" style={{ color: '#111' }}>
                    🤖 Podsumowanie AI tygodnia
                  </h3>
                  <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#555' }}>
                    {weeklySummary}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
