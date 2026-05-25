'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type Lesson = {
  id: string
  title: string
  video_url: string
  duration_minutes: number
  is_free_preview: boolean
  module_id: string
  order_index: number
  content?: string
}

type Module = {
  id: string
  title: string
  order_index: number
  lessons: Lesson[]
}

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
  const router = useRouter()
  const params = useParams()
  const courseId = params.courseId as string
  const lessonId = params.lessonId as string
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [lessonId])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    const { data: coreUser } = await supabase
      .schema('core')
      .from('users')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .single()

    if (coreUser) {
      setUserId(coreUser.id)

      const { data: sub } = await supabase
        .schema('payments')
        .from('subscriptions')
        .select('status')
        .eq('user_id', coreUser.id)
        .eq('status', 'active')
        .single()

      setHasSubscription(!!sub)

      const { data: progress } = await supabase
        .schema('academy')
        .from('lesson_progress')
        .select('completed')
        .eq('user_id', coreUser.id)
        .eq('lesson_id', lessonId)
        .single()

      if (progress) setCompleted(progress.completed)
    }

    const { data: lessonData } = await supabase
      .schema('academy')
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single()

    if (!lessonData) {
      router.push(`/courses`)
      return
    }

    if (!lessonData.is_free_preview && !hasSubscription) {
      router.push('/pricing')
      return
    }

    setLesson(lessonData)

    const { data: modulesData } = await supabase
      .schema('academy')
      .from('modules')
      .select('id, title, order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    if (modulesData) {
      const modulesWithLessons = await Promise.all(
        modulesData.map(async (mod) => {
          const { data: lessonsData } = await supabase
            .schema('academy')
            .from('lessons')
            .select('id, title, duration_minutes, is_free_preview, module_id, order_index, content, video_url')
            .eq('module_id', mod.id)
            .order('order_index', { ascending: true })
          return { ...mod, lessons: lessonsData || [] }
        })
      )
      setModules(modulesWithLessons)

      const allLessons = modulesWithLessons.flatMap(m => m.lessons)
      const currentIndex = allLessons.findIndex(l => l.id === lessonId)
      if (currentIndex > 0) setPrevLesson(allLessons[currentIndex - 1])
      if (currentIndex < allLessons.length - 1) setNextLesson(allLessons[currentIndex + 1])
    }

    setLoading(false)
  }

  async function markComplete() {
    if (!userId || !lessonId) return

    const { error } = await supabase
      .schema('academy')
      .from('lesson_progress')
      .upsert({
        user_id: userId,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' })

    if (!error) {
      setCompleted(true)
      if (nextLesson) {
        router.push(`/courses/${courseId}/lesson/${nextLesson.id}`)
      }
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Ładowanie...</p>
    </div>
  )

  if (!lesson) return null

  const videoId = extractYouTubeId(lesson.video_url)

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-gray-300 hover:text-white"
            onClick={() => router.push('/courses')}
          >
            ← Kursy
          </Button>
          <span className="text-white font-medium text-sm truncate max-w-xs">{lesson.title}</span>
          {lesson.is_free_preview && <Badge variant="outline" className="text-xs text-gray-300">Preview</Badge>}
        </div>
        <div className="flex items-center gap-3">
          {completed ? (
            <Badge variant="default" className="bg-green-600">✓ Ukończono</Badge>
          ) : (
            <Button size="sm" onClick={markComplete} className="bg-green-600 hover:bg-green-700">
              Oznacz jako ukończone
            </Button>
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)]">
        <div className="flex-1 flex flex-col">
          {videoId ? (
            <div className="relative w-full bg-black" style={{ paddingTop: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-800">
              <p className="text-gray-400">Brak wideo dla tej lekcji</p>
            </div>
          )}

          <div className="bg-gray-900 p-6 flex-1 overflow-y-auto">
            <h1 className="text-white text-xl font-bold mb-2">{lesson.title}</h1>
            {lesson.duration_minutes > 0 && (
              <p className="text-gray-400 text-sm mb-4">{lesson.duration_minutes} min</p>
            )}
            {lesson.content && (
              <p className="text-gray-300 text-sm leading-relaxed">{lesson.content}</p>
            )}

            <div className="flex gap-3 mt-6">
              {prevLesson && (
                <Button
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:text-white"
                  onClick={() => router.push(`/courses/${courseId}/lesson/${prevLesson.id}`)}
                >
                  ← Poprzednia
                </Button>
              )}
              {nextLesson && (
                <Button
                  onClick={() => {
                    if (!completed) markComplete()
                    else router.push(`/courses/${courseId}/lesson/${nextLesson.id}`)
                  }}
                  className="bg-white text-black hover:bg-gray-100"
                >
                  Następna lekcja →
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="w-80 bg-gray-800 overflow-y-auto border-l border-gray-700 hidden lg:block">
          <div className="p-4 border-b border-gray-700">
            <p className="text-white font-medium text-sm">Spis lekcji</p>
          </div>
          {modules.map((mod, modIndex) => (
            <div key={mod.id}>
              <div className="px-4 py-3 bg-gray-750">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                  Moduł {modIndex + 1} – {mod.title}
                </p>
              </div>
              {mod.lessons.map((l, lIndex) => {
                const canAccess = hasSubscription || l.is_free_preview
                return (
                  <div
                    key={l.id}
                    onClick={() => canAccess && router.push(`/courses/${courseId}/lesson/${l.id}`)}
                    className={`px-4 py-3 border-b border-gray-700 flex items-center gap-3 transition-colors ${
                      l.id === lessonId
                        ? 'bg-gray-700'
                        : canAccess
                        ? 'cursor-pointer hover:bg-gray-750'
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-gray-500 text-xs w-5">{lIndex + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${l.id === lessonId ? 'text-white font-medium' : 'text-gray-300'}`}>
                        {l.title}
                      </p>
                      {l.duration_minutes > 0 && (
                        <p className="text-gray-500 text-xs">{l.duration_minutes} min</p>
                      )}
                    </div>
                    {!canAccess && <span className="text-gray-600 text-xs">🔒</span>}
                    {l.id === lessonId && <span className="text-blue-400 text-xs">▶</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}