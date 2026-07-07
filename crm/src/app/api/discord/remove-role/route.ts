import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { discordUserId } = await request.json()
  if (!discordUserId) return NextResponse.json({ ok: true })

  await fetch(
    `https://discord.com/api/guilds/${process.env.DISCORD_SERVER_ID}/members/${discordUserId}/roles/${process.env.DISCORD_STUDENT_ROLE_ID}`,
    { method: 'DELETE', headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}` } }
  )

  return NextResponse.json({ ok: true })
}
