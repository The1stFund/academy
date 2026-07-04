import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/emails'

export async function POST(request: NextRequest) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 })
  await sendWelcomeEmail(email)
  return NextResponse.json({ ok: true })
}
