import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, password, role } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email i hasło są wymagane' }, { status: 400 })
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (authData.user) {
      await supabase
        .schema('core')
        .from('users')
        .update({ role: role || 'student' })
        .eq('auth_user_id', authData.user.id)
    }

    return NextResponse.json({ success: true, user: authData.user })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}