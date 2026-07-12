'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBookOpen, faDownload, faArrowRightFromBracket, faChevronRight, faLock } from '@fortawesome/free-solid-svg-icons'

type Ebook = {
  id: string
  title: string
  description: string
  author: string
  cover_url: string
  file_url: string
  file_size_mb: number
  created_at: string
}

export default function EbooksPage() {
  const [ebooks, setEbooks] = useState<Ebook[]>([])
  const [loading, setLoading] = useState(true)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [user, setUser] = useState<{ email: string; full_name?: string } | null>(null)
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
      const { data: sub } = await supabase.schema('payments').from('subscriptions').select('status').eq('user_id', coreUser.id).eq('status', 'active').single()
      setHasSubscription(!!sub)
    }

    const { data: ebooksData } = await supabase.rpc('get_published_ebooks')
    if (ebooksData) setEbooks(ebooksData as Ebook[])
    setLoading(false)
  }

  async function handleDownload(ebook: Ebook) {
    if (!hasSubscription) return
    // Generate signed URL for private bucket
    const path = ebook.file_url.split('/ebooks/')[1]
    if (path) {
      const { data } = await supabase.storage.from('ebooks').createSignedUrl(path, 60)
      if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    } else {
      window.open(ebook.file_url, '_blank')
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Kursy', href: '/courses' },
    { label: 'Analizy rynku', href: '/analysis' },
    { label: 'Biblioteka', href: '/ebooks', active: true },
    { label: 'Program afiliacyjny', href: '/affiliate' },
    { label: 'Profil', href: '/profile' },
  ]

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#16db65', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'var(--font-montserrat), sans-serif' }}>
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0" style={{ background: '#111' }}>
        <div className="px-6 py-6 border-b" style={{ borderColor: '#222' }}>
          <Link href="/" className="flex items-center gap-3">
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
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
              style={{ background: item.active ? 'rgba(22,219,101,0.1)' : 'transparent', color: item.active ? '#16db65' : '#aaa' }}
            >
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {item.active && <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '10px' }} />}
            </Link>
          ))}
        </nav>
        <div className="px-4 py-4 border-t" style={{ borderColor: '#222' }}>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full" style={{ color: '#666' }}>
            <FontAwesomeIcon icon={faArrowRightFromBracket} style={{ fontSize: '14px', width: '16px' }} />
            <span className="text-sm font-medium">Wyloguj się</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 overflow-auto">
        <div className="px-6 md:px-8 py-8 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#111' }}>Biblioteka ebooków</h1>
            <p className="text-sm" style={{ color: '#888' }}>Materiały edukacyjne dostępne dla subskrybentów</p>
          </div>

          {!hasSubscription && (
            <div className="rounded-2xl p-5 mb-8 flex items-center justify-between" style={{ background: '#fff8e6', border: '1px solid #fde68a' }}>
              <div>
                <p className="font-bold text-sm mb-1" style={{ color: '#92400e' }}>Wymagana subskrypcja</p>
                <p className="text-xs" style={{ color: '#b45309' }}>Kup subskrypcję aby pobierać ebooki</p>
              </div>
              <Link href="/pricing" className="px-4 py-2.5 rounded-xl font-bold text-sm text-white flex-shrink-0 ml-4" style={{ background: '#16db65' }}>
                Kup dostęp
              </Link>
            </div>
          )}

          {ebooks.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border" style={{ borderColor: '#f0f0f0' }}>
              <FontAwesomeIcon icon={faBookOpen} style={{ color: '#ddd', fontSize: '48px' }} />
              <p className="mt-4 font-semibold" style={{ color: '#aaa' }}>Brak ebooków</p>
              <p className="text-sm mt-1" style={{ color: '#ccc' }}>Materiały pojawią się wkrótce</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ebooks.map(ebook => (
                <div key={ebook.id} className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#f0f0f0' }}>
                  {ebook.cover_url ? (
                    <img src={ebook.cover_url} alt={ebook.title} className="w-full h-48 object-cover" />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center" style={{ background: '#f8f9fa' }}>
                      <FontAwesomeIcon icon={faBookOpen} style={{ color: '#16db65', fontSize: '48px' }} />
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="font-bold text-base mb-1" style={{ color: '#111' }}>{ebook.title}</h3>
                    {ebook.author && <p className="text-xs mb-2" style={{ color: '#888' }}>Autor: {ebook.author}</p>}
                    {ebook.description && <p className="text-sm mb-4 line-clamp-2" style={{ color: '#666' }}>{ebook.description}</p>}
                    <div className="flex items-center justify-between">
                      {ebook.file_size_mb && <span className="text-xs" style={{ color: '#aaa' }}>{ebook.file_size_mb} MB</span>}
                      <button
                        onClick={() => handleDownload(ebook)}
                        disabled={!hasSubscription}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-opacity"
                        style={{
                          background: hasSubscription ? '#16db65' : '#f5f5f5',
                          color: hasSubscription ? '#111' : '#aaa',
                          opacity: hasSubscription ? 1 : 0.7,
                          cursor: hasSubscription ? 'pointer' : 'not-allowed'
                        }}
                      >
                        <FontAwesomeIcon icon={hasSubscription ? faDownload : faLock} style={{ fontSize: '12px' }} />
                        {hasSubscription ? 'Pobierz' : 'Zablokowane'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
