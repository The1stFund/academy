'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGraduationCap, faChartLine, faTrophy, faHandshake, faUser, faArrowRightFromBracket, faChevronRight, faLock, faPlay, faClock, faTag } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'

type Post = { id: string; title: string; content: string; video_url: string; images: string[]; tags: string[]; published_at: string }

function extractYouTubeId(url: string): string | null {
  const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  return match ? match[1] : null
}

export default function AnalysisPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ email: string; full_name?: string } | null>(null)
  const [coreUserId, setCoreUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: coreUser } = await supabase.schema('core').from('users').select('id, email').eq('auth_user_id', session.user.id).single()
    if (coreUser) {
      setCoreUserId(coreUser.id)
      const { data: profile } = await supabase.schema('core').from('profiles').select('full_name').eq('user_id', coreUser.id).single()
      setUser({ email: coreUser.email, full_name: profile?.full_name })
      const { data: sub } = await supabase.schema('payments').from('subscriptions').select('status').eq('user_id', coreUser.id).eq('status', 'active').single()
      setHasSubscription(!!sub)
      if (sub) {
        const { data: postsData } = await supabase.schema('academy_content').from('market_posts').select('id, title, content, video_url, images, tags, published_at').eq('is_published', true).order('published_at', { ascending: false })
        if (postsData) { setPosts(postsData); if (postsData.length > 0) setSelectedPost(postsData[0]) }
        // Track that user watched analysis this week
        await supabase.rpc('track_analysis_watched', { p_user_id: coreUser.id })
      }
    }
    setLoading(false)
  }

  async function handleLogout() { await supabase.auth.signOut(); router.push('/') }

  function formatDate(d: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const navItems = [
    { icon: faGraduationCap, label: 'Kursy', href: '/courses' },
    { icon: faChartLine, label: 'Analizy rynku', href: '/analysis', active: true },
    { icon: faTrophy, label: 'Leaderboard', href: '/leaderboard', locked: !hasSubscription },
    { icon: faHandshake, label: 'Program afiliacyjny', href: '/affiliate' },
    { icon: faUser, label: 'Profil', href: '/profile' },
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
            <Link key={item.label} href={(item as any).locked ? '#' : item.href}
              onClick={(item as any).locked ? (e: React.MouseEvent) => e.preventDefault() : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
              style={{ background: (item as any).active ? 'rgba(22,219,101,0.1)' : 'transparent', color: (item as any).active ? '#16db65' : (item as any).locked ? '#444' : '#aaa' }}
            >
              <FontAwesomeIcon icon={(item as any).locked ? faLock : item.icon} style={{ fontSize: '14px', width: '16px' }} />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              {!(item as any).locked && <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '10px', color: '#444' }} />}
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
        {!hasSubscription ? (
          <div className="flex items-center justify-center min-h-full p-8">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: '#f0fdf4' }}>
                <FontAwesomeIcon icon={faChartLine} style={{ color: '#16db65', fontSize: '28px' }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: '#111' }}>Analizy rynku</h2>
              <p className="text-sm mb-6" style={{ color: '#888' }}>Codzienne analizy rynku są dostępne tylko dla subskrybentów.</p>
              <Link href="/pricing" className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-white" style={{ background: '#16db65' }}>
                Kup subskrypcję – £49/msc
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex h-full">
            <div className="w-80 flex-shrink-0 border-r bg-white overflow-auto" style={{ borderColor: '#f0f0f0' }}>
              <div className="px-4 py-4 border-b" style={{ borderColor: '#f0f0f0' }}>
                <h2 className="font-bold text-sm" style={{ color: '#111' }}>Analizy rynku</h2>
                <p className="text-xs mt-0.5" style={{ color: '#888' }}>{posts.length} analiz</p>
              </div>
              <div className="divide-y" style={{ borderColor: '#f5f5f5' }}>
                {posts.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm" style={{ color: '#888' }}>Brak analiz</p>
                  </div>
                ) : posts.map(post => (
                  <div key={post.id} onClick={() => { setSelectedPost(post); if (coreUserId) supabase.rpc('track_analysis_watched', { p_user_id: coreUserId }) }}
                    className="px-4 py-4 cursor-pointer transition-colors"
                    style={{ background: selectedPost?.id === post.id ? '#f0fdf4' : 'white' }}
                    onMouseEnter={e => { if (selectedPost?.id !== post.id) (e.currentTarget as HTMLElement).style.background = '#fafafa' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = selectedPost?.id === post.id ? '#f0fdf4' : 'white' }}
                  >
                    {post.video_url && extractYouTubeId(post.video_url) && (
                      <div className="relative w-full rounded-lg overflow-hidden mb-3" style={{ paddingTop: '56.25%', background: '#f5f5f5' }}>
                        <img src={`https://img.youtube.com/vi/${extractYouTubeId(post.video_url)}/mqdefault.jpg`} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                            <FontAwesomeIcon icon={faPlay} style={{ color: 'white', fontSize: '12px' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <h3 className="text-sm font-semibold mb-1 leading-snug" style={{ color: selectedPost?.id === post.id ? '#16db65' : '#111' }}>{post.title}</h3>
                    <p className="text-xs" style={{ color: '#aaa' }}>{formatDate(post.published_at)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {selectedPost ? (
                <div className="max-w-3xl px-8 py-8">
                  <h1 className="text-2xl font-bold mb-2" style={{ color: '#111' }}>{selectedPost.title}</h1>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#888' }}>
                      <FontAwesomeIcon icon={faClock} style={{ fontSize: '11px' }} />
                      {formatDate(selectedPost.published_at)}
                    </div>
                    {selectedPost.tags && selectedPost.tags.length > 0 && (
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faTag} style={{ fontSize: '11px', color: '#aaa' }} />
                        <div className="flex gap-1.5 flex-wrap">
                          {selectedPost.tags.map((tag, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#f0fdf4', color: '#16db65' }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedPost.video_url && extractYouTubeId(selectedPost.video_url) && (
                    <div className="relative w-full rounded-2xl overflow-hidden mb-6" style={{ paddingTop: '56.25%' }}>
                      <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${extractYouTubeId(selectedPost.video_url)}?rel=0&modestbranding=1`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  )}

                  {selectedPost.images && selectedPost.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {selectedPost.images.map((img, i) => (
                        <img key={i} src={img} alt={`Wykres ${i+1}`} className="w-full rounded-xl border object-cover" style={{ borderColor: '#f0f0f0' }} />
                      ))}
                    </div>
                  )}

                  {selectedPost.content && (
                    <div className="prose prose-sm max-w-none">
                      <p className="text-sm leading-relaxed" style={{ color: '#555' }}>{selectedPost.content}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm" style={{ color: '#888' }}>Wybierz analizę z listy</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
