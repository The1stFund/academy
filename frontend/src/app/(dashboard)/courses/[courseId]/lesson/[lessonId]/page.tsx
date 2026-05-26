'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faCheck, faLock, faChevronRight, faChevronLeft, faList } from '@fortawesome/free-solid-svg-icons'
import Link from 'next/link'

type Lesson = { id: string; title: string; video_url: string; duration_minutes: number; is_free_preview: boolean; module_id: string; order_index: number; content?: string }
type Module = { id: string; title: string; order_index: number; lessons: Lesson[] }

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  return match ? match[1] : null
}

export default function LessonPage() {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [nextLesson, setNextLesson] = useState<Lesson | null>(null)
  const [prevLesson, setPrevLesson] = useState<Lesson | null>(null)
  const [completed, setCompleted] = useState(false)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string
  const lessonId = params.lessonId as string
  const supabase = createClient()

  useEffect(() => { loadData() }, [lessonId])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: coreUser } = await supabase.schema('core').from('users').select('id').eq('auth_user_id', session.user.id).single()
    if (coreUser) {
      setUserId(coreUser.id)
      const { data: sub } = await supabase.schema('payments').from('subscriptions').select('status').eq('user_id', coreUser.id).eq('status', 'active').single()
      setHasSubscription(!!sub)
      const { data: progress } = await supabase.schema('academy').from('lesson_progress').select('completed').eq('user_id', coreUser.id).eq('lesson_id', lessonId).single()
      if (progress) setCompleted(progress.completed)
    }
    const { data: lessonData } = await supabase.schema('academy').from('lessons').select('*').eq('id', lessonId).single()
    if (!lessonData) { router.push('/courses'); return }
    setLesson(lessonData)
    const { data: modulesData } = await supabase.schema('academy').from('modules').select('id, title, order_index').eq('course_id', courseId).order('order_index', { ascending: true })
    if (modulesData) {
      const modulesWithLessons = await Promise.all(modulesData.map(async (mod) => {
        const { data: lessonsData } = await supabase.schema('academy').from('lessons').select('id, title, duration_minutes, is_free_preview, module_id, order_index, content, video_url').eq('module_id', mod.id).order('order_index', { ascending: true })
        return { ...mod, lessons: lessonsData || [] }
      }))
      setModules(modulesWithLessons)
      const allLessons = modulesWithLessons.flatMap(m => m.lessons)
      const currentIndex = allLessons.findIndex(l => l.id === lessonId)
      if (currentIndex > 0) setPrevLesson(allLessons[currentIndex - 1])
      if (currentIndex < allLessons.length - 1) setNextLesson(allLessons[currentIndex + 1])
    }
    setLoading(false)
  }

  async function markComplete() {
    if (!userId) return
    await supabase.schema('academy').from('lesson_progress').upsert({ user_id: userId, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() }, { onConflict: 'user_id,lesson_id' })
    setCompleted(true)
    if (nextLesson) router.push(`/courses/${courseId}/lesson/${nextLesson.id}`)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#16db65', borderTopColor: 'transparent' }} />
    </div>
  )
  if (!lesson) return null

  const videoId = extractYouTubeId(lesson.video_url)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f0f0f', fontFamily: 'var(--font-montserrat), sans-serif' }}>

      <header className="flex items-center justify-between px-6 py-3 border-b flex-shrink-0" style={{ borderColor: '#222', background: '#111' }}>
        <div className="flex items-center gap-4">
          <Link href="/courses" className="flex items-center gap-2 text-sm font-medium" style={{ color: '#888' }}>
            <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: '11px' }} />
            Kursy
          </Link>
          <span style={{ color: '#333' }}>|</span>
          <span className="text-sm font-medium text-white truncate max-w-xs">{lesson.title}</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg transition-colors hover:bg-white/10" style={{ color: '#888' }}>
            <FontAwesomeIcon icon={faList} style={{ fontSize: '14px' }} />
          </button>
          {completed ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'rgba(22,219,101,0.15)', color: '#16db65' }}>
              <FontAwesomeIcon icon={faCheck} style={{ fontSize: '12px' }} />
              Ukończono
            </div>
          ) : (
            <button onClick={markComplete} className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ background: '#16db65' }}>
              Oznacz jako ukończone
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-auto">
          {videoId ? (
            <div className="relative w-full" style={{ paddingTop: '56.25%', background: '#000' }}>
              <iframe className="absolute inset-0 w-full h-full" src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            </div>
          ) : (
            <div className="flex items-center justify-center h-64" style={{ background: '#1a1a1a' }}>
              <p style={{ color: '#555' }}>Brak wideo dla tej lekcji</p>
            </div>
          )}

          <div className="px-8 py-6">
            <h1 className="text-xl font-bold text-white mb-2">{lesson.title}</h1>
            {lesson.duration_minutes > 0 && <p className="text-sm mb-4" style={{ color: '#555' }}>{lesson.duration_minutes} min</p>}
            {lesson.content && <p className="text-sm leading-relaxed" style={{ color: '#888' }}>{lesson.content}</p>}
            <div className="flex gap-3 mt-6">
              {prevLesson && (
                <button onClick={() => router.push(`/courses/${courseId}/lesson/${prevLesson.id}`)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-white/5" style={{ borderColor: '#333', color: '#aaa' }}>
                  <FontAwesomeIcon icon={faChevronLeft} style={{ fontSize: '11px' }} />
                  Poprzednia
                </button>
              )}
              {nextLesson && (
                <button onClick={() => { if (!completed) markComplete(); else router.push(`/courses/${courseId}/lesson/${nextLesson.id}`) }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ background: '#16db65' }}>
                  Następna lekcja
                  <FontAwesomeIcon icon={faChevronRight} style={{ fontSize: '11px' }} />
                </button>
              )}
            </div>
          </div>
        </div>

        {sidebarOpen && (
          <div className="w-80 flex-shrink-0 border-l overflow-auto" style={{ borderColor: '#222', background: '#111' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: '#222' }}>
              <p className="text-sm font-bold text-white">Spis lekcji</p>
            </div>
            {modules.map((mod, modIndex) => (
              <div key={mod.id}>
                <div className="px-4 py-2.5 border-b" style={{ borderColor: '#1a1a1a', background: '#0f0f0f' }}>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#555' }}>Moduł {modIndex + 1} – {mod.title}</p>
                </div>
                {mod.lessons.map((l, lIndex) => {
                  const canAccess = hasSubscription || l.is_free_preview
                  const isActive = l.id === lessonId
                  return (
                    <div key={l.id} onClick={() => canAccess && router.push(`/courses/${courseId}/lesson/${l.id}`)}
                      className="flex items-center gap-3 px-4 py-3 border-b transition-colors"
                      style={{ borderColor: '#1a1a1a', cursor: canAccess ? 'pointer' : 'not-allowed', background: isActive ? 'rgba(22,219,101,0.08)' : 'transparent' }}
                      onMouseEnter={e => { if (canAccess && !isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isActive ? 'rgba(22,219,101,0.08)' : 'transparent' }}
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isActive ? '#16db65' : canAccess ? '#222' : '#1a1a1a' }}>
                        <FontAwesomeIcon icon={canAccess ? faPlay : faLock} style={{ fontSize: '7px', color: isActive ? '#111' : canAccess ? '#16db65' : '#444' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate font-medium" style={{ color: isActive ? '#16db65' : canAccess ? '#ccc' : '#444' }}>{l.title}</p>
                        {l.duration_minutes > 0 && <p className="text-xs" style={{ color: '#555' }}>{l.duration_minutes} min</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
