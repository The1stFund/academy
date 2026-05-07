'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Course = {
  id: string
  title: string
  description: string
  is_published: boolean
}

type Module = {
  id: string
  title: string
  description: string
  order_index: number
  lessons?: Lesson[]
}

type Lesson = {
  id: string
  title: string
  video_url: string
  duration_minutes: number
  is_free_preview: boolean
  order_index: number
}

function parseYouTubeDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  return hours * 60 + minutes + Math.ceil(seconds / 60)
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  return match ? match[1] : null
}

export default function CourseEditPage() {
  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [showModuleForm, setShowModuleForm] = useState(false)
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const [newLesson, setNewLesson] = useState({ title: '', video_url: '', duration_minutes: 0, is_free_preview: false })
  const [showLessonForm, setShowLessonForm] = useState<string | null>(null)
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null)
  const [editingLessonModuleId, setEditingLessonModuleId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [fetchingYT, setFetchingYT] = useState(false)
  const [fetchingYTEdit, setFetchingYTEdit] = useState(false)
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadCourse()
    loadModules()
  }, [courseId])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
  }

  async function loadCourse() {
    const { data, error } = await supabase
      .schema('academy')
      .from('courses')
      .select('id, title, description, is_published')
      .eq('id', courseId)
      .single()
    if (!error && data) setCourse(data)
  }

  async function loadModules() {
    const { data: modulesData, error } = await supabase
      .schema('academy')
      .from('modules')
      .select('id, title, description, order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    if (!error && modulesData) {
      const modulesWithLessons = await Promise.all(
        modulesData.map(async (mod) => {
          const { data: lessonsData } = await supabase
            .schema('academy')
            .from('lessons')
            .select('id, title, video_url, duration_minutes, is_free_preview, order_index')
            .eq('module_id', mod.id)
            .order('order_index', { ascending: true })
          return { ...mod, lessons: lessonsData || [] }
        })
      )
      setModules(modulesWithLessons)
    }
    setLoading(false)
  }

  async function fetchYouTubeData(url: string, forEdit = false) {
    const videoId = extractYouTubeId(url)
    if (!videoId) return
    forEdit ? setFetchingYTEdit(true) : setFetchingYT(true)
    try {
      const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`
      )
      const data = await res.json()
      if (data.items && data.items.length > 0) {
        const video = data.items[0]
        const title = video.snippet.title
        const duration = parseYouTubeDuration(video.contentDetails.duration)
        if (forEdit && editingLesson) {
          setEditingLesson(prev => prev ? { ...prev, title: prev.title || title, duration_minutes: duration, video_url: url } : prev)
        } else {
          setNewLesson(prev => ({ ...prev, title: prev.title || title, duration_minutes: duration, video_url: url }))
        }
      }
    } catch (e) {
      console.error('YouTube API error:', e)
    }
    forEdit ? setFetchingYTEdit(false) : setFetchingYT(false)
  }

  async function addModule() {
    if (!newModuleTitle.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .schema('academy')
      .from('modules')
      .insert({ course_id: courseId, title: newModuleTitle, order_index: modules.length })
      .select()
      .single()
    if (!error && data) {
      setModules([...modules, { ...data, lessons: [] }])
      setNewModuleTitle('')
      setShowModuleForm(false)
    }
    setSaving(false)
  }

  async function addLesson(moduleId: string) {
    if (!newLesson.title.trim()) return
    setSaving(true)
    const module = modules.find(m => m.id === moduleId)
    const lessonCount = module?.lessons?.length || 0
    const { data, error } = await supabase
      .schema('academy')
      .from('lessons')
      .insert({
        module_id: moduleId,
        title: newLesson.title,
        video_url: newLesson.video_url,
        duration_minutes: newLesson.duration_minutes,
        is_free_preview: newLesson.is_free_preview,
        order_index: lessonCount,
      })
      .select()
      .single()
    if (!error && data) {
      setModules(modules.map(m =>
        m.id === moduleId ? { ...m, lessons: [...(m.lessons || []), data] } : m
      ))
      setNewLesson({ title: '', video_url: '', duration_minutes: 0, is_free_preview: false })
      setShowLessonForm(null)
    }
    setSaving(false)
  }

  async function saveEditedLesson() {
    if (!editingLesson || !editingLessonModuleId) return
    setSaving(true)
    const { error } = await supabase
      .schema('academy')
      .from('lessons')
      .update({
        title: editingLesson.title,
        video_url: editingLesson.video_url,
        duration_minutes: editingLesson.duration_minutes,
        is_free_preview: editingLesson.is_free_preview,
      })
      .eq('id', editingLesson.id)
    if (!error) {
      setModules(modules.map(m =>
        m.id === editingLessonModuleId
          ? { ...m, lessons: (m.lessons || []).map(l => l.id === editingLesson.id ? editingLesson : l) }
          : m
      ))
      setEditingLesson(null)
      setEditingLessonModuleId(null)
    }
    setSaving(false)
  }

  async function deleteModule(moduleId: string) {
    if (!confirm('Usunąć moduł wraz ze wszystkimi lekcjami?')) return
    const { error } = await supabase.schema('academy').from('modules').delete().eq('id', moduleId)
    if (!error) setModules(modules.filter(m => m.id !== moduleId))
  }

  async function deleteLesson(moduleId: string, lessonId: string) {
    if (!confirm('Usunąć tę lekcję?')) return
    const { error } = await supabase.schema('academy').from('lessons').delete().eq('id', lessonId)
    if (!error) {
      setModules(modules.map(m =>
        m.id === moduleId ? { ...m, lessons: (m.lessons || []).filter(l => l.id !== lessonId) } : m
      ))
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Ładowanie...</p></div>
  if (!course) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Kurs nie znaleziony</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard/content/courses')}>← Wróć</Button>
          <h1 className="text-xl font-bold">{course.title}</h1>
          <Badge variant={course.is_published ? 'default' : 'secondary'}>
            {course.is_published ? 'Opublikowany' : 'Szkic'}
          </Badge>
        </div>
        <Button onClick={() => setShowModuleForm(!showModuleForm)}>+ Nowy moduł</Button>
      </header>

      <main className="p-6 space-y-4">
        {course.description && <p className="text-gray-500">{course.description}</p>}

        {showModuleForm && (
          <Card>
            <CardHeader><CardTitle>Dodaj moduł</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tytuł modułu</Label>
                <Input
                  placeholder="np. Moduł 1 – Wprowadzenie"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addModule} disabled={saving}>{saving ? 'Zapisywanie...' : 'Zapisz moduł'}</Button>
                <Button variant="outline" onClick={() => setShowModuleForm(false)}>Anuluj</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {modules.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">Brak modułów – dodaj pierwszy moduł</CardContent>
          </Card>
        ) : (
          modules.map((mod, modIndex) => (
            <Card key={mod.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">Moduł {modIndex + 1}</span>
                    <CardTitle className="text-base">{mod.title}</CardTitle>
                    <Badge variant="outline">{mod.lessons?.length || 0} lekcji</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}>
                      {expandedModule === mod.id ? 'Zwiń' : 'Rozwiń'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShowLessonForm(showLessonForm === mod.id ? null : mod.id)}>
                      + Lekcja
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteModule(mod.id)}>Usuń</Button>
                  </div>
                </div>
              </CardHeader>

              {(expandedModule === mod.id || showLessonForm === mod.id) && (
                <CardContent className="space-y-3">
                  {showLessonForm === mod.id && (
                    <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
                      <p className="font-medium text-sm">Nowa lekcja</p>
                      <div className="space-y-2">
                        <Label>URL wideo YouTube (unlisted)</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={newLesson.video_url}
                            onChange={(e) => setNewLesson({ ...newLesson, video_url: e.target.value })}
                          />
                          <Button variant="outline" onClick={() => fetchYouTubeData(newLesson.video_url)} disabled={fetchingYT || !newLesson.video_url}>
                            {fetchingYT ? 'Pobieranie...' : 'Pobierz dane'}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-400">Wklej link i kliknij "Pobierz dane" – tytuł i czas uzupełnią się automatycznie</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Tytuł lekcji</Label>
                        <Input
                          placeholder="Uzupełni się automatycznie z YouTube"
                          value={newLesson.title}
                          onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Czas trwania (minuty)</Label>
                        <Input
                          type="number"
                          placeholder="Uzupełni się automatycznie"
                          value={newLesson.duration_minutes || ''}
                          onChange={(e) => setNewLesson({ ...newLesson, duration_minutes: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id={`preview-${mod.id}`} checked={newLesson.is_free_preview}
                          onChange={(e) => setNewLesson({ ...newLesson, is_free_preview: e.target.checked })} />
                        <Label htmlFor={`preview-${mod.id}`}>Bezpłatny podgląd</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => addLesson(mod.id)} disabled={saving}>
                          {saving ? 'Zapisywanie...' : 'Zapisz lekcję'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowLessonForm(null)}>Anuluj</Button>
                      </div>
                    </div>
                  )}

                  {mod.lessons && mod.lessons.length > 0 ? (
                    <div className="space-y-2">
                      {mod.lessons.map((lesson, lessonIndex) => (
                        <div key={lesson.id}>
                          {editingLesson?.id === lesson.id ? (
                            <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
                              <p className="font-medium text-sm">Edytuj lekcję</p>
                              <div className="space-y-2">
                                <Label>URL wideo YouTube</Label>
                                <div className="flex gap-2">
                                  <Input
                                    value={editingLesson.video_url}
                                    onChange={(e) => setEditingLesson({ ...editingLesson, video_url: e.target.value })}
                                  />
                                  <Button variant="outline" onClick={() => fetchYouTubeData(editingLesson.video_url, true)} disabled={fetchingYTEdit || !editingLesson.video_url}>
                                    {fetchingYTEdit ? 'Pobieranie...' : 'Pobierz dane'}
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Tytuł lekcji</Label>
                                <Input
                                  value={editingLesson.title}
                                  onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Czas trwania (minuty)</Label>
                                <Input
                                  type="number"
                                  value={editingLesson.duration_minutes || ''}
                                  onChange={(e) => setEditingLesson({ ...editingLesson, duration_minutes: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" id={`edit-preview-${lesson.id}`} checked={editingLesson.is_free_preview}
                                  onChange={(e) => setEditingLesson({ ...editingLesson, is_free_preview: e.target.checked })} />
                                <Label htmlFor={`edit-preview-${lesson.id}`}>Bezpłatny podgląd</Label>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={saveEditedLesson} disabled={saving}>
                                  {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => { setEditingLesson(null); setEditingLessonModuleId(null) }}>Anuluj</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-400">{lessonIndex + 1}.</span>
                                <div>
                                  <p className="text-sm font-medium">{lesson.title}</p>
                                  <p className="text-xs text-gray-400">
                                    {lesson.duration_minutes ? `${lesson.duration_minutes} min` : 'Brak czasu'}
                                    {lesson.is_free_preview && ' · Bezpłatny podgląd'}
                                    {lesson.video_url && ' · YT'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {lesson.is_free_preview && <Badge variant="outline" className="text-xs">Preview</Badge>}
                                <Button variant="outline" size="sm" onClick={() => { setEditingLesson(lesson); setEditingLessonModuleId(mod.id) }}>
                                  Edytuj
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => deleteLesson(mod.id, lesson.id)}>Usuń</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-2">Brak lekcji w tym module</p>
                  )}
                </CardContent>
              )}
            </Card>
          ))
        )}
      </main>
    </div>
  )
}