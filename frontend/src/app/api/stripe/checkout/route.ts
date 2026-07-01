import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { priceId, userId, couponCode, referralCode } = await request.json()

    if (!priceId || !userId) {
      return NextResponse.json({ error: 'Missing priceId or userId' }, { status: 400 })
    }

    // userId is always auth_user_id (from supabase.auth session) —
    // we resolve core.users server-side using service role key to avoid RLS issues.
    const { data: coreUser } = await supabaseAdmin
      .schema('core')
      .from('users')
      .select('id, email, auth_user_id')
      .eq('auth_user_id', userId)
      .single()

    if (!coreUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Resolve our internal plan_id from the Stripe price ID so the webhook
    // can store it on payments.subscriptions.plan_id
    const { data: plan } = await supabaseAdmin
      .schema('payments')
      .from('plans')
      .select('id')
      .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
      .single()

    let discounts: any = undefined
    let isFreeViaCoupon = false

    if (couponCode) {
      const { data: coupon } = await supabaseAdmin
        .schema('payments')
        .from('coupons')
        .select('*')
        .eq('code', couponCode)
        .eq('is_active', true)
        .single()

      if (coupon && coupon.stripe_coupon_id) {
        discounts = [{ coupon: coupon.stripe_coupon_id }]
        isFreeViaCoupon = coupon.discount_percent === 100
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: coreUser.email,
      discounts,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
      metadata: {
        user_id: coreUser.auth_user_id,
        plan_id: plan?.id || '',
        coupon_code: couponCode || '',
        is_free_via_coupon: isFreeViaCoupon ? 'true' : 'false',
        referral_code: referralCode || '',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}