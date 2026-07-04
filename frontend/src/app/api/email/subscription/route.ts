import { NextRequest, NextResponse } from 'next/server'
import { sendSubscriptionConfirmationEmail } from '@/lib/emails'

export async function POST(request: NextRequest) {
  const { email, plan } = await request.json()
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })
  await sendSubscriptionConfirmationEmail(email, plan || 'monthly')
  return NextResponse.json({ ok: true })
}
