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
  return account === '0' ? 'license_open.dat' : 'license_' + account + '.dat'
}

export async function POST(request: NextRequest) {
  try {
    const { mt4_account, expiry, universal, never_expires, user_id, mode } = await request.json()

    if (!process.env.HAND_TRADER_LICENSE_SECRET) {
      return NextResponse.json({ error: 'License secret not configured' }, { status: 500 })
    }

    const account = universal ? '0' : mt4_account
    const expiryStr = never_expires ? 'NEVER' : expiry

    if (!account) {
      return NextResponse.json({ error: 'Missing account number' }, { status: 400 })
    }
    if (!expiryStr) {
      return NextResponse.json({ error: 'Missing expiry date' }, { status: 400 })
    }

    const content = generateLicenseContent(account, expiryStr)
    const filename = licenseFilename(account)

    await supabaseAdmin.schema('trading').from('licenses').insert({
      user_id: user_id || null,
      mt4_account: account,
      expiry: expiryStr,
      filename,
      is_universal: universal || false,
      generated_by: mode || 'admin',
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
