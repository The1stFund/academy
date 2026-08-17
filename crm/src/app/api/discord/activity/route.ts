import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ANALYSIS_CHANNELS = [
  '1536689129411059722',
  '1536689217915322458',
  '1536689290824650852',
  '1536689451185606656',
]

const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY!

async function verifyDiscordSignature(request: NextRequest, body: string): Promise<boolean> {
  const signature = request.headers.get('x-signature-ed25519')
  const timestamp = request.headers.get('x-signature-timestamp')
  if (!signature || !timestamp) return false

  try {
    const { subtle } = globalThis.crypto
    const encoder = new TextEncoder()
    const keyData = Buffer.from(DISCORD_PUBLIC_KEY, 'hex')
    const key = await subtle.importKey('raw', keyData, { name: 'Ed25519' }, false, ['verify'])
    const data = encoder.encode(timestamp + body)
    const sig = Buffer.from(signature, 'hex')
    return await subtle.verify('Ed25519', key, sig, data)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const body = await request.text()

  const isValid = await verifyDiscordSignature(request, body)
  if (!isValid) {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  const payload = JSON.parse(body)

  if (payload.type === 1) {
    return NextResponse.json({ type: 1 })
  }

  if (payload.type === 0) {
    const channelId = payload.channel_id
    const discordUserId = payload.author?.id

    if (!ANALYSIS_CHANNELS.includes(channelId) || !discordUserId || payload.author?.bot) {
      return NextResponse.json({ ok: true })
    }

    const { data: userRecord } = await supabaseAdmin
      .rpc('get_user_by_discord_id', { p_discord_id: discordUserId })

    if (!userRecord) {
      return NextResponse.json({ ok: true })
    }

    const today = new Date()
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const weekStart = new Date(today.setDate(diff)).toISOString().split('T')[0]

    await supabaseAdmin.rpc('track_discord_activity', {
      p_user_id: userRecord,
      p_week_start: weekStart,
    })
  }

  return NextResponse.json({ ok: true })
}
