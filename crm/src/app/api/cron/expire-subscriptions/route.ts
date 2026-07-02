import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  // Verify request comes from Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: count, error } = await supabaseAdmin.rpc('expire_subscriptions')

  if (error) {
    console.error('expire_subscriptions error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`Expired ${count} subscriptions`)
  return NextResponse.json({ expired: count })
}
