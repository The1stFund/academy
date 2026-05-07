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

type Course = {
  id: string
  title: string
  description: string
  is_published: boolean
  order_index: number
  created_at: string
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadCourses()
  }, [])

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) router.push('/login')
  }

  async function loadCourses() {
    const { data, error } = await supabase
      .schema('academy')
      .from('courses')
      .select('id, title, description, is_published, order_index, created_at')
      .order('order_index', { ascending: true })

    if (!error && data) setCourses(data)
    setLoading(false)
  }

  async function addCourse() {
    if (!newTitle.trim()) return
    setSaving(true)

    const { data, error } = await supabase
      .schema('academy')
      .from('courses')
      .insert({
        title: newTitle,
        description: newDescription,
        is_published: false,
        order_index: courses.length,
      })
      .select()
      .single()

    if (!error && data) {
      setCourses([...courses, data])
      setNewTitle('')
      setNewDescription('')
      setShowForm(false)
    }
    setSaving(false)
  }

  async function togglePublish(courseId: string, currentStatus: boolean) {
    const { error } = await supabase
      .schema('academy')
      .from('courses')
      .update({ is_published: !currentStatus })
      .eq('id', courseId)

    if (!error) {
      setCourses(courses.map(c =>
        c.id === courseId ? { ...c, is_published: !currentStatus } : c
      ))
    }
  }

  async function deleteCourse(courseId: string) {
    if (!confirm('Czy na pewno chcesz usunąć ten kurs?')) return

    const { error } = await supabase
      .schema('academy')
      .from('courses')
      .delete()
      .eq('id', courseId)

    if (!error) {
      setCourses(courses.filter(c => c.id !== courseId))
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pl-PL')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => router.push('/dashboard/content')}>← Wróć</Button>
          <h1 className="text-xl font-bold">Kursy</h1>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>+ Nowy kurs</Button>
      </header>

      <main className="p-6">
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Dodaj nowy kurs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tytuł kursu</Label>
                <Input
                  placeholder="np. Podstawy analizy technicznej"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Opis</Label>
                <Input
                  placeholder="Krótki opis kursu..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={addCourse} disabled={saving}>
                  {saving ? 'Zapisywanie...' : 'Zapisz kurs'}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Anuluj
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Wszystkie kursy ({courses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Ładowanie...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tytuł</TableHead>
                    <TableHead>Opis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500">
                        Brak kursów
                      </TableCell>
                    </TableRow>
                  ) : (
                    courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {course.description || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={course.is_published ? 'default' : 'secondary'}>
                            {course.is_published ? 'Opublikowany' : 'Szkic'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(course.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/dashboard/content/courses/${course.id}`)}
                            >
                              Edytuj
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => togglePublish(course.id, course.is_published)}
                            >
                              {course.is_published ? 'Cofnij' : 'Opublikuj'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteCourse(course.id)}
                            >
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