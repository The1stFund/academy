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
  category: string
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
  const [category, setCategory] = useState<'course' | 'analysis'>('course')
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'import' | 'course_bank' | 'analysis_bank'>('import')
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
      .order('created_at', { ascending: true })
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
      .filter(Boolean) as string[]

    if (videoIds.length === 0) {
      alert('Nie znaleziono poprawnych linków YouTube')
      setFetching(false)
      return
    }

    const videoMap: Record<string, { title: string; duration: number }> = {}
    const chunkSize = 50
    for (let i = 0; i < videoIds.length; i += chunkSize) {
      const chunk = videoIds.slice(i, i + chunkSize)
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?id=${chunk.join(',')}&part=snippet,contentDetails&key=${apiKey}`
        )
        const data = await res.json()
        if (data.items) {
          data.items.forEach((item: any) => {
            videoMap[item.id] = {
              title: item.snippet.title,
              duration: parseYouTubeDuration(item.contentDetails.duration),
            }
          })
        }
      } catch (e) {
        console.error('Błąd pobierania partii', i, e)
      }
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
          category,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    if (toInsert.length > 0) {
      setSaving(true)
      let totalSaved = 0
      const batchSize = 100
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize)
        const { data: saved, error } = await supabase
          .schema('academy')
          .from('video_bank')
          .insert(batch as any)
          .select()
        if (!error && saved) totalSaved += saved.length
      }
      await loadVideos()
      setUrlsText('')
      setActiveTab(category === 'course' ? 'course_bank' : 'analysis_bank')
      alert(`✅ Dodano ${totalSaved} wideo do banku ${category === 'course' ? 'kursu' : 'analiz'}!`)
      setSaving(false)
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

  async function assignToAnalysis() {
    if (!assigningVideo) return
    setAssigning(true)

    const { data: coreUser } = await supabase
      .schema('core')
      .from('users')
      .select('id')
      .eq('auth_user_id', (await supabase.auth.getUser()).data.user?.id || '')
      .single()

    if (!coreUser) { setAssigning(false); return }

    const { error } = await supabase
      .schema('academy_content')
      .from('market_posts')
      .insert({
        title: assigningVideo.title,
        content: '',
        video_url: assigningVideo.video_url,
        is_published: true,
        published_at: new Date().toISOString(),
        author_id: coreUser.id,
      })

    if (!error) {
      await supabase
        .schema('academy')
        .from('video_bank')
        .update({ is_assigned: true })
        .eq('id', assigningVideo.id)

      setVideos(videos.map(v =>
        v.id === assigningVideo.id ? { ...v, is_assigned: true } : v
      ))
      setAssigningVideo(null)
      alert(`✅ Dodano do analiz rynku!`)
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

  const courseVideos = videos.filter(v => v.category === 'course')
  const analysisVideos = videos.filter(v => v.category === 'analysis')
  const unassignedCourse = courseVideos.filter(v => !v.is_assigned)
  const unassignedAnalysis = analysisVideos.filter(v => !v.is_assigned)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard/content/courses')}>← Wróć</Button>
          <h1 className="text-xl font-bold">Bank wideo</h1>
          <Badge variant="outline">{unassignedCourse.length} kurs</Badge>
          <Badge variant="secondary">{unassignedAnalysis.length} analizy</Badge>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-6">

        <div className="flex gap-2 border-b">
          {([
            { key: 'import', label: 'Import linków' },
            { key: 'course_bank', label: `Bank kursu (${courseVideos.length})` },
            { key: 'analysis_bank', label: `Bank analiz (${analysisVideos.length})` },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-black'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'import' && (
          <Card>
            <CardHeader>
              <CardTitle>Importuj linki YouTube</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Kategoria wideo</Label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCategory('course')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      category === 'course'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    🎓 Kurs
                  </button>
                  <button
                    onClick={() => setCategory('analysis')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      category === 'analysis'
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    📊 Analizy rynku
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Wklej linki do filmów – jeden link per linia. Obsługuje dowolną liczbę linków.
              </p>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-sm min-h-48 bg-white resize-y font-mono"
                placeholder={`https://www.youtube.com/watch?v=abc123\nhttps://www.youtube.com/watch?v=def456`}
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
              />
              <div className="flex items-center gap-4">
                <Button
                  onClick={fetchAndSaveToBank}
                  disabled={fetching || saving || !urlsText.trim()}
                >
                  {fetching ? 'Pobieranie z YouTube...' : saving ? 'Zapisywanie...' : `Dodaj do banku ${category === 'course' ? 'kursu' : 'analiz'}`}
                </Button>
                <p className="text-sm text-gray-400">
                  {urlsText.split('\n').filter(u => u.trim()).length} linków
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'course_bank' && (
          <div className="space-y-6">
            {assigningVideo && assigningVideo.category === 'course' && (
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-base">Przypisz: {assigningVideo.title}</CardTitle>
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
                    <Button variant="outline" onClick={() => { setAssigningVideo(null); setSelectedCourse(''); setSelectedModule('') }}>
                      Anuluj
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Wideo kursu – nieprzypisane ({unassignedCourse.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <p className="text-gray-500">Ładowanie...</p> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Tytuł</TableHead>
                        <TableHead>Czas</TableHead>
                        <TableHead>Akcje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unassignedCourse.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500">
                            Wszystkie wideo kursu są przypisane
                          </TableCell>
                        </TableRow>
                      ) : (
                        unassignedCourse.map((video, index) => (
                          <TableRow key={video.id}>
                            <TableCell className="text-gray-400 text-sm">{index + 1}</TableCell>
                            <TableCell>
                              <p className="font-medium text-sm">{video.title}</p>
                            </TableCell>
                            <TableCell className="text-sm">{video.duration_minutes} min</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => setAssigningVideo(video)}>
                                  Przypisz
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => deleteVideo(video.id)}>
                                  Usuń
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {courseVideos.filter(v => v.is_assigned).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-gray-500">
                    Przypisane ({courseVideos.filter(v => v.is_assigned).length})
                  </CardTitle>
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
                      {courseVideos.filter(v => v.is_assigned).map((video) => (
                        <TableRow key={video.id} className="opacity-60">
                          <TableCell className="text-sm">{video.title}</TableCell>
                          <TableCell className="text-sm">{video.duration_minutes} min</TableCell>
                          <TableCell><Badge variant="default" className="text-xs">Przypisane</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'analysis_bank' && (
          <div className="space-y-6">
            {assigningVideo && assigningVideo.category === 'analysis' && (
              <Card className="border-2 border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-base">Publikuj analizę: {assigningVideo.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-600">
                    To wideo zostanie dodane jako analiza rynku widoczna dla subskrybentów.
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={assignToAnalysis} disabled={assigning}>
                      {assigning ? 'Publikowanie...' : 'Dodaj do analiz rynku'}
                    </Button>
                    <Button variant="outline" onClick={() => setAssigningVideo(null)}>Anuluj</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Bank analiz – nieprzypisane ({unassignedAnalysis.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <p className="text-gray-500">Ładowanie...</p> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Tytuł</TableHead>
                        <TableHead>Czas</TableHead>
                        <TableHead>Akcje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unassignedAnalysis.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-gray-500">
                            Wszystkie analizy są opublikowane
                          </TableCell>
                        </TableRow>
                      ) : (
                        unassignedAnalysis.map((video, index) => (
                          <TableRow key={video.id}>
                            <TableCell className="text-gray-400 text-sm">{index + 1}</TableCell>
                            <TableCell>
                              <p className="font-medium text-sm">{video.title}</p>
                            </TableCell>
                            <TableCell className="text-sm">{video.duration_minutes} min</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => setAssigningVideo(video)}>
                                  Publikuj
                                </Button>
                                <Button variant="destructive" size="sm" onClick={() => deleteVideo(video.id)}>
                                  Usuń
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </main>
    </div>
  )
}