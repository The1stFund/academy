'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Course = {
  id: string
  title: string
  description: string
  thumbnail_url: string
  is_published: boolean
}

type Module = {
  id: string
  title: string
  order_index: number
  lessons: Lesson[]
}

type Lesson = {
  id: string
  title: string
  duration_minutes: number
  is_free_preview: boolean
  completed?: boolean
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [hasSubscription, setHasSubscription] = useState(false)
  const [loading, setLoading] = useState(true)
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

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
      const { data: sub } = await supabase
        .schema('payments')
        .from('subscriptions')
        .select('status')
        .eq('user_id', coreUser.id)
        .eq('status', 'active')
        .single()

      setHasSubscription(!!sub)
    }

    const { data: coursesData } = await supabase
      .schema('academy')
      .from('courses')
      .select('id, title, description, thumbnail_url, is_published')
      .eq('is_published', true)
      .order('order_index', { ascending: true })

    if (coursesData) {
      setCourses(coursesData)
      if (coursesData.length > 0) {
        await loadCourse(coursesData[0], coreUser?.id)
      }
    }

    setLoading(false)
  }

  async function loadCourse(course: Course, userId?: string) {
    setSelectedCourse(course)

    const { data: modulesData } = await supabase
      .schema('academy')
      .from('modules')
      .select('id, title, order_index')
      .eq('course_id', course.id)
      .order('order_index', { ascending: true })

    if (!modulesData) return

    const modulesWithLessons = await Promise.all(
      modulesData.map(async (mod) => {
        const { data: lessonsData } = await supabase
          .schema('academy')
          .from('lessons')
          .select('id, title, duration_minutes, is_free_preview')
          .eq('module_id', mod.id)
          .order('order_index', { ascending: true })

        let lessons = lessonsData || []

        if (userId) {
          const { data: progressData } = await supabase
            .schema('academy')
            .from('lesson_progress')
            .select('lesson_id, completed')
            .eq('user_id', userId)
            .in('lesson_id', lessons.map(l => l.id))

          lessons = lessons.map(l => ({
            ...l,
            completed: progressData?.find(p => p.lesson_id === l.id)?.completed || false,
          }))
        }

        return { ...mod, lessons }
      })
    )

    setModules(modulesWithLessons)
    if (modulesWithLessons.length > 0) {
      setExpandedModule(modulesWithLessons[0].id)
    }
  }

  function getTotalLessons() {
    return modules.reduce((sum, m) => sum + m.lessons.length, 0)
  }

  function getCompletedLessons() {
    return modules.reduce((sum, m) => sum + m.lessons.filter(l => l.completed).length, 0)
  }

  function getTotalDuration() {
    const total = modules.reduce((sum, m) =>
      sum + m.lessons.reduce((s, l) => s + (l.duration_minutes || 0), 0), 0)
    const hours = Math.floor(total / 60)
    const minutes = total % 60
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Ładowanie...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard')}>← Wróć</Button>
          <h1 className="text-xl font-bold">Kursy</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6">
        {!hasSubscription && (
          <Card className="border-2 border-amber-200 bg-amber-50 mb-6">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="font-medium">Brak aktywnej subskrypcji</p>
                <p className="text-sm text-gray-500">Możesz oglądać tylko darmowe podglądy lekcji</p>
              </div>
              <Button onClick={() => router.push('/pricing')}>
                Kup dostęp – £49/msc
              </Button>
            </CardContent>
          </Card>
        )}

        {selectedCourse && (
          <div className="space-y-6">
            <Card>
              <CardContent className="py-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{selectedCourse.title}</h2>
                    {selectedCourse.description && (
                      <p className="text-gray-500 mb-4">{selectedCourse.description}</p>
                    )}
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>📚 {getTotalLessons()} lekcji</span>
                      <span>⏱ {getTotalDuration()}</span>
                      {hasSubscription && (
                        <span>✅ {getCompletedLessons()} ukończonych</span>
                      )}
                    </div>
                  </div>
                  {hasSubscription && getTotalLessons() > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-gray-500 mb-1">Postęp</p>
                      <p className="text-2xl font-bold">
                        {Math.round((getCompletedLessons() / getTotalLessons()) * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {modules.map((mod, modIndex) => (
                <Card key={mod.id}>
                  <div
                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-400">
                        Moduł {modIndex + 1}
                      </span>
                      <h3 className="font-medium">{mod.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {mod.lessons.length} lekcji
                      </Badge>
                      {hasSubscription && mod.lessons.some(l => l.completed) && (
                        <Badge variant="default" className="text-xs">
                          {mod.lessons.filter(l => l.completed).length}/{mod.lessons.length}
                        </Badge>
                      )}
                    </div>
                    <span className="text-gray-400">
                      {expandedModule === mod.id ? '▲' : '▼'}
                    </span>
                  </div>

                  {expandedModule === mod.id && (
                    <CardContent className="pt-0 pb-4">
                      <div className="space-y-1">
                        {mod.lessons.map((lesson, lessonIndex) => {
                          const canAccess = hasSubscription || lesson.is_free_preview
                          return (
                            <div
                              key={lesson.id}
                              onClick={() => canAccess && router.push(`/courses/${selectedCourse.id}/lesson/${lesson.id}`)}
                              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                                canAccess
                                  ? 'cursor-pointer hover:bg-gray-50'
                                  : 'opacity-50 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-400 w-6">{lessonIndex + 1}.</span>
                                <div className="flex items-center gap-2">
                                  {lesson.completed ? (
                                    <span className="text-green-500 text-sm">✓</span>
                                  ) : canAccess ? (
                                    <span className="text-gray-400 text-sm">▶</span>
                                  ) : (
                                    <span className="text-gray-400 text-sm">🔒</span>
                                  )}
                                  <span className="text-sm font-medium">{lesson.title}</span>
                                  {lesson.is_free_preview && (
                                    <Badge variant="outline" className="text-xs">Preview</Badge>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-gray-400">
                                {lesson.duration_minutes ? `${lesson.duration_minutes} min` : ''}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {courses.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Brak dostępnych kursów
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}