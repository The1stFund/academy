'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGraduationCap, faChartLine, faTrophy, faHandshake, faUser, faArrowRightFromBracket, faChevronRight, faLock, faPlay, faCheck, faClock, faBookOpen } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'

type Course = { id: string; title: string; description: string; thumbnail_url: string; is_published: boolean }
type Module = { id: string; title: string; order_index: number; lessons: Lesson[] }
type Lesson = { id: string; title: string; duration_minutes: number; is_free_preview: boolean; completed?: boolean }

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [hasSubscription, setHasSubscription] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
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
      const { data: coursesData } = await supabase.schema('academy').from('courses').select('id, title, description, thumbnail_url, is_published').eq('is_published', true).order('order_index', { ascending: true })
      if (coursesData) {
        setCourses(coursesData)
        if (coursesData.length > 0) await loadCourse(coursesData[0], coreUser.id)
      }
    }
    setLoading(false)
  }

  async function loadCourse(course: Course, userId?: string) {
    setSelectedCourse(course)
    const { data: modulesData } = await supabase.schema('academy').from('modules').select('id, title, order_index').eq('course_id', course.id).order('order_index', { ascending: true })
    if (!modulesData) return
    const modulesWithLessons = await Promise.all(modulesData.map(async (mod) => {
      const { data: lessonsData } = await supabase.schema('academy').from('lessons').select('id, title, duration_minutes, is_free_preview').eq('module_id', mod.id).order('order_index', { ascending: true })
      let lessons = lessonsData || []
      if (userId) {
        const { data: progressData } = await supabase.schema('academy').from('lesson_progress').select('lesson_id, completed').eq('user_id', userId).in('lesson_id', lessons.map(l => l.id))
        lessons = lessons.map(l => ({ ...l, completed: progressData?.find(p => p.lesson_id === l.id)?.completed || false }))
      }
      return { ...mod, lessons }
    }))
    setModules(modulesWithLessons)
    if (modulesWithLessons.length > 0) setExpandedModule(modulesWithLessons[0].id)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function getTotalLessons() { return modules.reduce((sum, m) => sum + m.lessons.length, 0) }
  function getCompletedLessons() { return modules.reduce((sum, m) => sum + m.lessons.filter(l => l.completed).length, 0) }
  function getTotalDuration() {
    const total = modules.reduce((sum, m) => sum + m.lessons.reduce((s, l) => s + (l.duration_minutes || 0), 0), 0)
    return total >= 60 ? `${Math.floor(total/60)}h ${total%60}min` : `${total}min`
  }

  const navItems = [
    { icon: faGraduationCap, label: 'Kursy', href: '/courses', active: true },
    { icon: faChartLine, label: 'Analizy rynku', href: '/analysis', locked: !hasSubscription },
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
              style={{ background: item.active ? 'rgba(22,219,101,0.1)' : 'transparent', color: item.active ? '#16db65' : (item as any).locked ? '#444' : '#aaa' }}
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
        <div className="px-8 py-8 max-w-4xl">

          {!hasSubscription && (
            <div className="rounded-2xl p-4 mb-6 flex items-center justify-between" style={{ background: '#fff8e6', border: '1px solid #fde68a' }}>
              <p className="text-sm font-medium" style={{ color: '#92400e' }}>Masz dostęp tylko do darmowych podglądów. <span style={{ color: '#b45309' }}>Kup subskrypcję aby odblokować wszystkie lekcje.</span></p>
              <Link href="/pricing" className="px-4 py-2 rounded-xl font-bold text-sm text-white flex-shrink-0 ml-4" style={{ background: '#16db65' }}>Kup dostęp</Link>
            </div>
          )}

          {selectedCourse && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#f0f0f0' }}>
                <h1 className="text-xl font-bold mb-2" style={{ color: '#111' }}>{selectedCourse.title}</h1>
                {selectedCourse.description && <p className="text-sm mb-4" style={{ color: '#888' }}>{selectedCourse.description}</p>}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#888' }}>
                    <FontAwesomeIcon icon={faBookOpen} style={{ color: '#16db65', fontSize: '13px' }} />
                    <span>{getTotalLessons()} lekcji</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm" style={{ color: '#888' }}>
                    <FontAwesomeIcon icon={faClock} style={{ color: '#16db65', fontSize: '13px' }} />
                    <span>{getTotalDuration()}</span>
                  </div>
                  {hasSubscription && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: '#888' }}>
                      <FontAwesomeIcon icon={faCheck} style={{ color: '#16db65', fontSize: '13px' }} />
                      <span>{getCompletedLessons()} ukończonych</span>
                    </div>
                  )}
                  {hasSubscription && getTotalLessons() > 0 && (
                    <div className="ml-auto flex items-center gap-2">
                      <div className="w-32 h-1.5 rounded-full bg-gray-100">
                        <div className="h-full rounded-full" style={{ background: '#16db65', width: `${Math.round((getCompletedLessons()/getTotalLessons())*100)}%` }} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: '#16db65' }}>{Math.round((getCompletedLessons()/getTotalLessons())*100)}%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {modules.map((mod, modIndex) => (
                  <div key={mod.id} className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#f0f0f0' }}>
                    <div className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: '#f0fdf4', color: '#16db65' }}>{modIndex + 1}</div>
                        <span className="font-semibold text-sm" style={{ color: '#111' }}>{mod.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#f5f5f5', color: '#888' }}>{mod.lessons.length} lekcji</span>
                        {hasSubscription && mod.lessons.some(l => l.completed) && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#f0fdf4', color: '#16db65' }}>
                            {mod.lessons.filter(l => l.completed).length}/{mod.lessons.length}
                          </span>
                        )}
                      </div>
                      <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '11px', color: '#aaa', transform: expandedModule === mod.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>
                    {expandedModule === mod.id && (
                      <div className="border-t" style={{ borderColor: '#f5f5f5' }}>
                        {mod.lessons.map((lesson, lessonIndex) => {
                          const canAccess = hasSubscription || lesson.is_free_preview
                          return (
                            <div key={lesson.id}
                              onClick={() => canAccess && router.push(`/courses/${selectedCourse.id}/lesson/${lesson.id}`)}
                              className="flex items-center gap-4 px-6 py-3 border-b last:border-0 transition-colors"
                              style={{ borderColor: '#f5f5f5', cursor: canAccess ? 'pointer' : 'not-allowed', background: 'white' }}
                              onMouseEnter={e => { if (canAccess) (e.currentTarget as HTMLElement).style.background = '#fafafa' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white' }}
                            >
                              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: lesson.completed ? '#f0fdf4' : canAccess ? '#f5f5f5' : '#f5f5f5' }}>
                                {lesson.completed ? (
                                  <FontAwesomeIcon icon={faCheck} style={{ fontSize: '10px', color: '#16db65' }} />
                                ) : canAccess ? (
                                  <FontAwesomeIcon icon={faPlay} style={{ fontSize: '9px', color: '#16db65' }} />
                                ) : (
                                  <FontAwesomeIcon icon={faLock} style={{ fontSize: '9px', color: '#ccc' }} />
                                )}
                              </div>
                              <span className="text-xs text-gray-400 w-5 flex-shrink-0">{lessonIndex + 1}.</span>
                              <span className="text-sm flex-1 font-medium" style={{ color: canAccess ? '#111' : '#ccc' }}>{lesson.title}</span>
                              {lesson.is_free_preview && !hasSubscription && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#f0fdf4', color: '#16db65' }}>Preview</span>
                              )}
                              {lesson.duration_minutes > 0 && (
                                <span className="text-xs flex-shrink-0" style={{ color: '#aaa' }}>{lesson.duration_minutes} min</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
