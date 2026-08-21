import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const LICENSE_SECRET = process.env.HAND_TRADER_LICENSE_SECRET!
const TIMESTAMP_WINDOW_MINUTES = 10

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface SyncTrade {
  ticket: number
  symbol: string
  type: 'buy' | 'sell'
  open_time: string
  close_time: string
  open_price: number
  close_price: number
  sl: number
  tp: number
  lots: number
  profit_currency: number
  profit_pips: number
  max_dd_pips: number
  max_dd_currency: number
}

interface SyncBody {
  account: string
  timestamp: string
  signature: string
  trades: SyncTrade[]
  dd_stats: {
    daily_dd_percent: number
    weekly_dd_percent: number
    floating_dd_percent: number
  }
}

function computeSignature(account: string, timestamp: string): string {
  return createHash('sha256')
    .update(account + '|' + timestamp + '|' + LICENSE_SECRET)
    .digest('hex')
}

function parseMt4Timestamp(ts: string): Date | null {
  const match = ts.match(/^(\d{4})\.(\d{2})\.(\d{2}) (\d{2}):(\d{2})$/)
  if (!match) return null
  const [, y, mo, d, h, mi] = match
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi))
}

export async function POST(request: NextRequest) {
  let body: SyncBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { account, timestamp, signature, trades, dd_stats } = body

  if (!account || !timestamp || !signature || !Array.isArray(trades)) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  const expected = computeSignature(account, timestamp)
  if (expected !== signature) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  const sentAt = parseMt4Timestamp(timestamp)
  if (!sentAt) {
    return NextResponse.json({ error: 'invalid_timestamp_format' }, { status: 400 })
  }

  const driftMinutes = Math.abs(Date.now() - sentAt.getTime()) / 60000
  if (driftMinutes > TIMESTAMP_WINDOW_MINUTES) {
    return NextResponse.json({ error: 'timestamp_out_of_window' }, { status: 401 })
  }

  const { data: userId, error: accountError } = await supabase
    .rpc('get_user_by_mt4_account', { p_account: account })

  if (accountError || !userId) {
    return NextResponse.json({ error: 'unknown_account' }, { status: 404 })
  }

  if (trades.length > 0) {
    const rows = trades.map((t) => ({
      user_id: userId,
      source: 'mt4_auto',
      ticket: String(t.ticket),
      symbol: t.symbol,
      trade_date: t.close_time.split(' ')[0].replace(/\./g, '-'),
      trade_time: t.close_time.split(' ')[1] || '00:00',
      entry: String(t.open_price),
      exit: String(t.close_price),
      sr_level: '',
      setup: '',
      trade_type: t.type,
      stop_loss: t.sl,
      take_profit: t.tp,
      risk_percent: 0,
      emotion_score: 5,
      notes: '',
      lots: t.lots,
      profit_pips: t.profit_pips,
      profit_currency: t.profit_currency,
      max_dd_pips: t.max_dd_pips,
      max_dd_currency: t.max_dd_currency,
    }))

    const { error: upsertError } = await supabase
      .rpc('upsert_mt4_journal_entries', { p_rows: rows })

    if (upsertError) {
      console.error('mt4/sync upsert error', JSON.stringify(upsertError))
      return NextResponse.json({ error: 'db_write_failed', details: upsertError.message }, { status: 500 })
    }
  }

  await supabase.rpc('insert_mt4_sync_log', {
    p_user_id: userId,
    p_account: account,
    p_trades_count: trades.length,
    p_daily_dd: dd_stats?.daily_dd_percent ?? null,
    p_weekly_dd: dd_stats?.weekly_dd_percent ?? null,
    p_floating_dd: dd_stats?.floating_dd_percent ?? null,
  })

  return NextResponse.json({ ok: true, received: trades.length })
}
