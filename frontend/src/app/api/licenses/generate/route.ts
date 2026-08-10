import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateLicenseContent(account: string, expiry: string): string {
  const secret = process.env.HAND_TRADER_LICENSE_SECRET || ''
  const data = account + '|' + expiry + '|' + secret
  const signature = createHash('sha256').update(data).digest('hex')
  return account + '\n' + expiry + '\n' + signature + '\n'
}

function licenseFilename(account: string): string {
  return 'license_' + account + '.dat'
}

export async function POST(request: NextRequest) {
  try {
    const { mt4_account, user_id } = await request.json()

    if (!process.env.HAND_TRADER_LICENSE_SECRET) {
      return NextResponse.json({ error: 'License secret not configured' }, { status: 500 })
    }

    if (!mt4_account || !user_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: sub } = await supabaseAdmin
      .schema('payments')
      .from('subscriptions')
      .select('current_period_end, status')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single()

    if (!sub) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 403 })
    }

    const endDate = new Date(sub.current_period_end)
    const yyyy = endDate.getFullYear()
    const mm = String(endDate.getMonth() + 1).padStart(2, '0')
    const dd = String(endDate.getDate()).padStart(2, '0')
    const expiryStr = yyyy + '.' + mm + '.' + dd + ' 23:59'

    const content = generateLicenseContent(mt4_account, expiryStr)
    const filename = licenseFilename(mt4_account)

    await supabaseAdmin.schema('trading').from('licenses').insert({
      user_id,
      mt4_account,
      expiry: expiryStr,
      filename,
      is_universal: false,
      generated_by: 'student',
    })

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
      },
    })
  } catch (error: any) {
    console.error('License generation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
