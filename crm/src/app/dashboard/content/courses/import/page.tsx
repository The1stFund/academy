'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type VideoBank = {
  id: string
  title: string
  video_url: string
  video_id: string
  duration_minutes: number
  is_assigned: boolean
  created_at: string
}

type Course = { id: string; title: string }
type Module = { id: string; title: string }

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  return match ? match[1] : null
}

function parseYouTubeDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  return hours * 60 + minutes + Math.ceil(seconds / 60)
}

export default function ImportPage() {
  const [videos, setVideos] = useState<VideoBank[]>([])
  const [loading, setLoading] = useState(true)
  const [urlsText, setUrlsText] = useState('')
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'import' | 'bank'>('import')
  const [courses, setCourses] = useState<Course[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [assigningVideo, setAssigningVideo] = useState<VideoBank | null>(null)
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedModule, setSelectedModule] = useState('')
  const [assigning, setAssigning] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadVideos()
    loadCourses()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
  }

  async function loadVideos() {
    const { data } = await supabase
      .schema('academy')
      .from('video_bank')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setVideos(data)
    setLoading(false)
  }

  async function loadCourses() {
    const { data } = await supabase
      .schema('academy')
      .from('courses')
      .select('id, title')
      .order('order_index', { ascending: true })
    if (data) setCourses(data)
  }

  async function loadModules(courseId: string) {
    const { data } = await supabase
      .schema('academy')
      .from('modules')
      .select('id, title')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })
    if (data) setModules(data)
  }

  async function fetchAndSaveToBank() {
    const urls = urlsText
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0)

    if (urls.length === 0) return
    setFetching(true)

    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
    const videoIds = urls
      .map(url => extractYouTubeId(url))
      .filter((item): item is NonNullable<typeof item> => item !== null)

    if (videoIds.length === 0) {
      alert('Nie znaleziono poprawnych linków YouTube')
      setFetching(false)
      return
    }

    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoIds.join(',')}&part=snippet,contentDetails&key=${apiKey}`
      )
      const data = await res.json()

      const videoMap: Record<string, { title: string; duration: number }> = {}
      if (data.items) {
        data.items.forEach((item: any) => {
          videoMap[item.id] = {
            title: item.snippet.title,
            duration: parseYouTubeDuration(item.contentDetails.duration),
          }
        })
      }

      const toInsert = urls
        .map(url => {
          const videoId = extractYouTubeId(url)
          if (!videoId) return null
          const info = videoMap[videoId]
          if (!info) return null
          return {
            title: info.title,
            video_url: url,
            video_id: videoId,
            duration_minutes: info.duration,
            is_assigned: false,
          }
        })
        .filter(Boolean)

      if (toInsert.length > 0) {
        setSaving(true)
        const { data: saved, error } = await supabase
          .schema('academy')
          .from('video_bank')
          .insert(toInsert as any)
          .select()

        if (!error && saved) {
          setVideos([...saved, ...videos])
          setUrlsText('')
          setActiveTab('bank')
          alert(`✅ Dodano ${saved.length} wideo do banku!`)
        }
        setSaving(false)
      }
    } catch (e) {
      alert('Błąd podczas pobierania danych z YouTube')
    }

    setFetching(false)
  }

  async function assignToModule() {
    if (!assigningVideo || !selectedModule) return
    setAssigning(true)

    const module = modules.find(m => m.id === selectedModule)
    const { data: existingLessons } = await supabase
      .schema('academy')
      .from('lessons')
      .select('id')
      .eq('module_id', selectedModule)

    const orderIndex = existingLessons?.length || 0

    const { data: lesson, error } = await supabase
      .schema('academy')
      .from('lessons')
      .insert({
        module_id: selectedModule,
        title: assigningVideo.title,
        video_url: assigningVideo.video_url,
        duration_minutes: assigningVideo.duration_minutes,
        is_free_preview: false,
        order_index: orderIndex,
      })
      .select()
      .single()

    if (!error && lesson) {
      await supabase
        .schema('academy')
        .from('video_bank')
        .update({ is_assigned: true, assigned_to_lesson_id: lesson.id })
        .eq('id', assigningVideo.id)

      setVideos(videos.map(v =>
        v.id === assigningVideo.id ? { ...v, is_assigned: true } : v
      ))
      setAssigningVideo(null)
      setSelectedCourse('')
      setSelectedModule('')
      alert(`✅ Przypisano do modułu: ${module?.title}`)
    }
    setAssigning(false)
  }

  async function deleteVideo(videoId: string) {
    if (!confirm('Usunąć to wideo z banku?')) return
    const { error } = await supabase
      .schema('academy')
      .from('video_bank')
      .delete()
      .eq('id', videoId)
    if (!error) setVideos(videos.filter(v => v.id !== videoId))
  }

  const unassigned = videos.filter(v => !v.is_assigned)
  const assigned = videos.filter(v => v.is_assigned)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard/content/courses')}>← Wróć</Button>
          <h1 className="text-xl font-bold">Bank wideo</h1>
          <Badge variant="outline">{unassigned.length} nieprzypisanych</Badge>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">

        <div className="flex gap-2 border-b">
          {(['import', 'bank'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-black'
              }`}
            >
              {tab === 'import' ? 'Import linków' : `Bank wideo (${videos.length})`}
            </button>
          ))}
        </div>

        {activeTab === 'import' && (
          <Card>
            <CardHeader>
              <CardTitle>Importuj linki YouTube do banku</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                Wklej linki do filmów – jeden link per linia. System automatycznie pobierze tytuły i czasy trwania.
              </p>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm min-h-48 bg-white resize-y font-mono"
                placeholder={`https://www.youtube.com/watch?v=abc123\nhttps://www.youtube.com/watch?v=def456\nhttps://youtu.be/ghi789`}
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
              />
              <div className="flex items-center gap-4">
                <Button
                  onClick={fetchAndSaveToBank}
                  disabled={fetching || saving || !urlsText.trim()}
                >
                  {fetching ? 'Pobieranie z YouTube...' : saving ? 'Zapisywanie...' : 'Dodaj do banku wideo'}
                </Button>
                <p className="text-sm text-gray-400">
                  {urlsText.split('\n').filter(u => u.trim()).length} linków
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'bank' && (
          <div className="space-y-6">

            {assigningVideo && (
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-base">Przypisz do modułu: {assigningVideo.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kurs</Label>
                      <select
                        value={selectedCourse}
                        onChange={(e) => {
                          setSelectedCourse(e.target.value)
                          setSelectedModule('')
                          loadModules(e.target.value)
                        }}
                        className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                      >
                        <option value="">-- Wybierz kurs --</option>
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Moduł</Label>
                      <select
                        value={selectedModule}
                        onChange={(e) => setSelectedModule(e.target.value)}
                        className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                        disabled={!selectedCourse}
                      >
                        <option value="">-- Wybierz moduł --</option>
                        {modules.map(m => (
                          <option key={m.id} value={m.id}>{m.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={assignToModule} disabled={!selectedModule || assigning}>
                      {assigning ? 'Przypisywanie...' : 'Przypisz do modułu'}
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setAssigningVideo(null)
                      setSelectedCourse('')
                      setSelectedModule('')
                    }}>
                      Anuluj
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <p className="text-gray-500">Ładowanie...</p>
            ) : (
              <>
                {unassigned.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Nieprzypisane ({unassigned.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tytuł</TableHead>
                            <TableHead>Czas</TableHead>
                            <TableHead>Akcje</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {unassigned.map((video) => (
                            <TableRow key={video.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{video.title}</p>
                                  <p className="text-xs text-gray-400 font-mono truncate max-w-xs">{video.video_url}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{video.duration_minutes} min</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setAssigningVideo(video)
                                      setActiveTab('bank')
                                    }}
                                  >
                                    Przypisz
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => deleteVideo(video.id)}
                                  >
                                    Usuń
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {assigned.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base text-gray-500">Przypisane ({assigned.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tytuł</TableHead>
                            <TableHead>Czas</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {assigned.map((video) => (
                            <TableRow key={video.id} className="opacity-60">
                              <TableCell>
                                <p className="font-medium text-sm">{video.title}</p>
                              </TableCell>
                              <TableCell className="text-sm">{video.duration_minutes} min</TableCell>
                              <TableCell>
                                <Badge variant="default" className="text-xs">Przypisane</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {videos.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                      Bank wideo jest pusty – przejdź do zakładki "Import linków" żeby dodać wideo
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

      </main>
    </div>
  )
}