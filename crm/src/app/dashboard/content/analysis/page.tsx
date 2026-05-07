'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type Post = {
  id: string
  title: string
  content: string
  video_url: string
  images: string[]
  tags: string[]
  is_published: boolean
  published_at: string
  created_at: string
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  return match ? match[1] : null
}

export default function AnalysisPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    video_url: '',
    tags: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadPosts()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
  }

  async function loadPosts() {
    const { data, error } = await supabase
      .schema('academy_content')
      .from('market_posts')
      .select('id, title, content, video_url, images, tags, is_published, published_at, created_at')
      .order('created_at', { ascending: false })
    if (!error && data) setPosts(data)
    setLoading(false)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploadingImages(true)

    const newUrls: string[] = []
    for (const file of Array.from(files)) {
      const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`
      const { data, error } = await supabase.storage
        .from('analysis-images')
        .upload(fileName, file)

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from('analysis-images')
          .getPublicUrl(data.path)
        newUrls.push(urlData.publicUrl)
      }
    }

    setUploadedImages(prev => [...prev, ...newUrls])
    setUploadingImages(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function removeImage(url: string) {
    const path = url.split('/analysis-images/')[1]
    await supabase.storage.from('analysis-images').remove([path])
    setUploadedImages(uploadedImages.filter(u => u !== url))
  }

  async function addPost() {
    if (!newPost.title.trim()) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: coreUser } = await supabase
      .schema('core')
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!coreUser) return

    const tags = newPost.tags
      ? newPost.tags.split(',').map(t => t.trim()).filter(Boolean)
      : []

    const { data, error } = await supabase
      .schema('academy_content')
      .from('market_posts')
      .insert({
        title: newPost.title,
        content: newPost.content,
        video_url: newPost.video_url,
        images: uploadedImages,
        tags,
        is_published: false,
        author_id: coreUser.id,
      })
      .select()
      .single()

    if (!error && data) {
      setPosts([data, ...posts])
      setNewPost({ title: '', content: '', video_url: '', tags: '' })
      setUploadedImages([])
      setShowForm(false)
    }
    setSaving(false)
  }

  async function togglePublish(postId: string, currentStatus: boolean) {
    const { error } = await supabase
      .schema('academy_content')
      .from('market_posts')
      .update({
        is_published: !currentStatus,
        published_at: !currentStatus ? new Date().toISOString() : null,
      })
      .eq('id', postId)
    if (!error) {
      setPosts(posts.map(p =>
        p.id === postId ? { ...p, is_published: !currentStatus } : p
      ))
    }
  }

  async function deletePost(postId: string) {
    if (!confirm('Czy na pewno chcesz usunąć tę analizę?')) return
    const { error } = await supabase
      .schema('academy_content')
      .from('market_posts')
      .delete()
      .eq('id', postId)
    if (!error) setPosts(posts.filter(p => p.id !== postId))
  }

  function formatDate(dateString: string) {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('pl-PL')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard/content')}>← Wróć</Button>
          <h1 className="text-xl font-bold">Analizy rynku</h1>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>+ Nowa analiza</Button>
      </header>

      <main className="p-6 space-y-6">
        {showForm && (
          <Card>
            <CardHeader><CardTitle>Dodaj nową analizę</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tytuł analizy</Label>
                <Input
                  placeholder="np. Analiza BTC/USD – 7 maja 2026"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Link do wideo YouTube (opcjonalnie)</Label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={newPost.video_url}
                  onChange={(e) => setNewPost({ ...newPost, video_url: e.target.value })}
                />
                {newPost.video_url && extractYouTubeId(newPost.video_url) && (
                  <div className="mt-2 rounded-lg overflow-hidden aspect-video w-full max-w-lg">
                    <iframe
                      width="100%"
                      height="100%"
                      src={`https://www.youtube.com/embed/${extractYouTubeId(newPost.video_url)}?rel=0&modestbranding=1`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Zdjęcia (wykresy, screenshoty)</Label>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <p className="text-sm text-gray-500">
                      {uploadingImages ? 'Przesyłanie...' : 'Kliknij aby dodać zdjęcia (PNG, JPG, WebP)'}
                    </p>
                    <Button variant="outline" size="sm" className="mt-2" type="button"
                      onClick={() => fileInputRef.current?.click()} disabled={uploadingImages}>
                      {uploadingImages ? 'Przesyłanie...' : 'Wybierz pliki'}
                    </Button>
                  </label>
                </div>
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    {uploadedImages.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt={`Zdjęcie ${i + 1}`} className="w-full h-24 object-cover rounded-lg border" />
                        <button
                          onClick={() => removeImage(url)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Opis / komentarz (opcjonalnie)</Label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm min-h-24 bg-white resize-y"
                  placeholder="Kluczowe poziomy, scenariusze, wnioski..."
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tagi (oddzielone przecinkiem)</Label>
                <Input
                  placeholder="np. BTC, krypto, analiza techniczna"
                  value={newPost.tags}
                  onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={addPost} disabled={saving || uploadingImages}>
                  {saving ? 'Zapisywanie...' : 'Zapisz jako szkic'}
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowForm(false)
                  setUploadedImages([])
                  setNewPost({ title: '', content: '', video_url: '', tags: '' })
                }}>Anuluj</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Wszystkie analizy ({posts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Ładowanie...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tytuł</TableHead>
                    <TableHead>Wideo</TableHead>
                    <TableHead>Zdjęcia</TableHead>
                    <TableHead>Tagi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Opublikowano</TableHead>
                    <TableHead>Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500">
                        Brak analiz – dodaj pierwszą
                      </TableCell>
                    </TableRow>
                  ) : (
                    posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium">{post.title}</TableCell>
                        <TableCell>
                          {post.video_url
                            ? <Badge variant="outline" className="text-xs">YT</Badge>
                            : <span className="text-gray-400 text-sm">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          {post.images && post.images.length > 0
                            ? <Badge variant="outline" className="text-xs">{post.images.length} zdjęć</Badge>
                            : <span className="text-gray-400 text-sm">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {post.tags && post.tags.length > 0
                              ? post.tags.map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                                ))
                              : <span className="text-gray-400 text-sm">—</span>
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={post.is_published ? 'default' : 'secondary'}>
                            {post.is_published ? 'Opublikowana' : 'Szkic'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(post.published_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm"
                              onClick={() => togglePublish(post.id, post.is_published)}>
                              {post.is_published ? 'Cofnij' : 'Opublikuj'}
                            </Button>
                            <Button variant="destructive" size="sm"
                              onClick={() => deletePost(post.id)}>
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
      </main>
    </div>
  )
}