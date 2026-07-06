import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const authUserId = searchParams.get('auth_user_id') || ''

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    response_type: 'code',
    scope: 'identify guilds.join',
    state: authUserId,
  })

  return NextResponse.redirect(`https://discord.com/oauth2/authorize?${params}`)
}
