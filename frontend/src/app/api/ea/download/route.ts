import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { data: files, error: listError } = await supabaseAdmin
      .storage
      .from('hand-trader')
      .list('', { limit: 100, sortBy: { column: 'name', order: 'desc' } })

    if (listError || !files || files.length === 0) {
      return NextResponse.json({ error: 'Nie udało się znaleźć pliku EA' }, { status: 500 })
    }

    const exFiles = files.filter(f => f.name.endsWith('.ex4'))
    if (exFiles.length === 0) {
      return NextResponse.json({ error: 'Brak pliku EA w storage' }, { status: 500 })
    }

    const latestFile = exFiles[0]

    const { data, error } = await supabaseAdmin
      .storage
      .from('hand-trader')
      .createSignedUrl(latestFile.name, 60)

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: 'Nie udało się pobrać pliku' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl, filename: latestFile.name })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
