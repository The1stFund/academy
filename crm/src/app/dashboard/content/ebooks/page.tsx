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

type Ebook = {
  id: string
  title: string
  description: string
  author: string
  file_url: string
  file_size_mb: number
  is_published: boolean
  created_at: string
}

export default function EbooksPage() {
  const [ebooks, setEbooks] = useState<Ebook[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newEbook, setNewEbook] = useState({
    title: '',
    description: '',
    author: '',
    file_url: '',
    file_size_mb: 0,
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadEbooks()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
  }

  async function loadEbooks() {
    const { data, error } = await supabase
      .schema('academy')
      .from('ebooks')
      .select('id, title, description, author, file_url, file_size_mb, is_published, created_at')
      .order('created_at', { ascending: false })
    if (!error && data) setEbooks(data)
    setLoading(false)
  }

  async function addEbook() {
    if (!newEbook.title.trim() || !newEbook.file_url.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .schema('academy')
      .from('ebooks')
      .insert({
        title: newEbook.title,
        description: newEbook.description,
        author: newEbook.author,
        file_url: newEbook.file_url,
        file_size_mb: newEbook.file_size_mb,
        is_published: false,
      })
      .select()
      .single()
    if (!error && data) {
      setEbooks([data, ...ebooks])
      setNewEbook({ title: '', description: '', author: '', file_url: '', file_size_mb: 0 })
      setShowForm(false)
    }
    setSaving(false)
  }

  async function togglePublish(ebookId: string, currentStatus: boolean) {
    const { error } = await supabase
      .schema('academy')
      .from('ebooks')
      .update({ is_published: !currentStatus })
      .eq('id', ebookId)
    if (!error) {
      setEbooks(ebooks.map(e =>
        e.id === ebookId ? { ...e, is_published: !currentStatus } : e
      ))
    }
  }

  async function deleteEbook(ebookId: string) {
    if (!confirm('Czy na pewno chcesz usunąć ten ebook?')) return
    const { error } = await supabase
      .schema('academy')
      .from('ebooks')
      .delete()
      .eq('id', ebookId)
    if (!error) setEbooks(ebooks.filter(e => e.id !== ebookId))
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pl-PL')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard/content')}>← Wróć</Button>
          <h1 className="text-xl font-bold">Biblioteka ebooków</h1>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>+ Nowy ebook</Button>
      </header>

      <main className="p-6 space-y-6">
        {showForm && (
          <Card>
            <CardHeader><CardTitle>Dodaj nowy ebook</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tytuł</Label>
                  <Input
                    placeholder="np. Podstawy Price Action"
                    value={newEbook.title}
                    onChange={(e) => setNewEbook({ ...newEbook, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Autor</Label>
                  <Input
                    placeholder="np. Jan Kowalski"
                    value={newEbook.author}
                    onChange={(e) => setNewEbook({ ...newEbook, author: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Opis</Label>
                <Input
                  placeholder="Krótki opis zawartości..."
                  value={newEbook.description}
                  onChange={(e) => setNewEbook({ ...newEbook, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>URL pliku PDF (Supabase Storage)</Label>
                  <Input
                    placeholder="https://..."
                    value={newEbook.file_url}
                    onChange={(e) => setNewEbook({ ...newEbook, file_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rozmiar pliku (MB)</Label>
                  <Input
                    type="number"
                    placeholder="np. 2.5"
                    value={newEbook.file_size_mb || ''}
                    onChange={(e) => setNewEbook({ ...newEbook, file_size_mb: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addEbook} disabled={saving}>
                  {saving ? 'Zapisywanie...' : 'Zapisz ebook'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Anuluj</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Wszystkie ebooki ({ebooks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Ładowanie...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tytuł</TableHead>
                    <TableHead>Autor</TableHead>
                    <TableHead>Rozmiar</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ebooks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500">
                        Brak ebooków – dodaj pierwszy
                      </TableCell>
                    </TableRow>
                  ) : (
                    ebooks.map((ebook) => (
                      <TableRow key={ebook.id}>
                        <TableCell className="font-medium">{ebook.title}</TableCell>
                        <TableCell className="text-gray-500 text-sm">{ebook.author || '—'}</TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {ebook.file_size_mb ? `${ebook.file_size_mb} MB` : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ebook.is_published ? 'default' : 'secondary'}>
                            {ebook.is_published ? 'Opublikowany' : 'Szkic'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(ebook.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm"
                              onClick={() => togglePublish(ebook.id, ebook.is_published)}>
                              {ebook.is_published ? 'Cofnij' : 'Opublikuj'}
                            </Button>
                            <Button variant="destructive" size="sm"
                              onClick={() => deleteEbook(ebook.id)}>
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