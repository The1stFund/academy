import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EA_FILENAME = 'The 1ST Hand Trader 20260806.ex4'

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .storage
      .from('hand-trader')
      .createSignedUrl(EA_FILENAME, 60)

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: 'Nie udało się pobrać pliku' }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
