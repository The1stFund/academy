import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: count, error } = await supabaseAdmin.rpc('revoke_inactive_free_accounts')

  if (error) {
    console.error('revoke_inactive_free_accounts error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`Revoked ${count} inactive free accounts`)
  return NextResponse.json({ revoked: count })
}
