import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function addMemberToServer(discordUserId: string, accessToken: string) {
  const res = await fetch(
    `https://discord.com/api/guilds/${process.env.DISCORD_SERVER_ID}/members/${discordUserId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ access_token: accessToken }),
    }
  )
  console.log('Add member status:', res.status)
}

async function addRoleToMember(discordUserId: string) {
  const res = await fetch(
    `https://discord.com/api/guilds/${process.env.DISCORD_SERVER_ID}/members/${discordUserId}/roles/${process.env.DISCORD_STUDENT_ROLE_ID}`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    }
  )
  console.log('Add role status:', res.status)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const authUserId = searchParams.get('state') // passed from connect endpoint
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (!code || !authUserId) {
    return NextResponse.redirect(`${appUrl}/dashboard?discord=error`)
  }

  try {
    // Exchange code for Discord access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('No access token:', tokenData)
      return NextResponse.redirect(`${appUrl}/dashboard?discord=error`)
    }

    const accessToken = tokenData.access_token

    // Get Discord user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })
    const discordUser = await userRes.json()
    const discordUserId = discordUser.id
    const discordUsername = `${discordUser.username}${discordUser.discriminator !== '0' ? '#' + discordUser.discriminator : ''}`

    // Add to server and assign Student role
    await addMemberToServer(discordUserId, accessToken)
    await addRoleToMember(discordUserId)

    // Save Discord ID to core.profiles via RPC
    const { error } = await supabaseAdmin.rpc('save_discord_connection', {
      p_auth_user_id: authUserId,
      p_discord_user_id: discordUserId,
      p_discord_username: discordUsername,
    })

    if (error) console.error('Save discord error:', error)

    return NextResponse.redirect(`${appUrl}/dashboard?discord=success`)
  } catch (error) {
    console.error('Discord callback error:', error)
    return NextResponse.redirect(`${appUrl}/dashboard?discord=error`)
  }
}
