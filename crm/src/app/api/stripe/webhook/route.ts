import { NextRequest, NextResponse } from 'next/server'
import { sendSubscriptionConfirmationEmail } from '@/lib/emails'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

// Single admin client - used for auth admin API and public schema RPC calls
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper: raw REST call to any Supabase schema (bypasses JS client schema switching issues)
async function supabaseREST(
  schema: string,
  table: string,
  method: 'GET' | 'POST' | 'PATCH',
  body?: object,
  query?: string
) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`
  const headers: Record<string, string> = {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    'Accept-Profile': schema,
    'Content-Profile': schema,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  return { data, status: res.status }
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error: any) {
    console.error('Webhook signature error:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }
    }
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

function getSubscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items?.data?.[0]
  if (item?.current_period_start && item?.current_period_end) {
    return {
      start: new Date(item.current_period_start * 1000).toISOString(),
      end: new Date(item.current_period_end * 1000).toISOString(),
    }
  }
  return {
    start: new Date().toISOString(),
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const authUserId = session.metadata?.user_id
  const planId = session.metadata?.plan_id
  const referralCode = session.metadata?.referral_code
  const isFreeViaCoupon = session.metadata?.is_free_via_coupon === 'true'

  if (!authUserId) {
    console.error('No auth_user_id in session metadata')
    return
  }

  // Get user email from Auth Admin API
  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(authUserId)
  if (!authUser) {
    console.error('Auth user not found:', authUserId)
    return
  }

  // Get core.users.id via RPC (public schema function, no schema switching needed)
  const { data: coreUserId, error: rpcError } = await supabaseAdmin.rpc('get_core_user_id', {
    p_auth_user_id: authUserId
  })
  if (!coreUserId) {
    console.error('Core user not found via RPC:', rpcError?.message)
    return
  }

  const stripeSubscriptionId = session.subscription as string
  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  const period = getSubscriptionPeriod(stripeSubscription)

  // Upsert subscription via RPC (security definer bypasses RLS on payments schema)
  const { data: subId, error: subError } = await supabaseAdmin.rpc('upsert_subscription', {
    p_user_id: coreUserId,
    p_plan_id: planId || null,
    p_stripe_subscription_id: stripeSubscriptionId,
    p_stripe_customer_id: session.customer as string,
    p_status: 'active',
    p_current_period_start: period.start,
    p_current_period_end: period.end,
    p_is_free_via_coupon: isFreeViaCoupon,
  })
  console.log('Subscription upsert:', subId, subError?.message)

  // Insert payment record via RPC (skip if amount is 0 - 100% coupon)
  let paymentId = null
  if ((session.amount_total || 0) > 0 && session.payment_intent) {
    const { data: pid, error: payError } = await supabaseAdmin.rpc('insert_payment', {
      p_user_id: coreUserId,
      p_stripe_payment_intent_id: session.payment_intent as string,
      p_amount: (session.amount_total || 0) / 100,
      p_currency: session.currency || 'usd',
      p_status: 'succeeded',
    })
    console.log('Payment insert:', pid, payError?.message)
    paymentId = pid
  } else {
    console.log('Zero amount - skipping payment record')
  }

  if (referralCode) {
    const { data: affiliateRows } = await supabaseREST(
      'affiliates', 'affiliates', 'GET', undefined,
      `referral_code=eq.${referralCode}&select=id`
    )
    const affiliateRow = Array.isArray(affiliateRows) ? affiliateRows[0] : null

    if (affiliateRow) {
      const { data: existingRefs } = await supabaseREST(
        'affiliates', 'referrals', 'GET', undefined,
        `referred_user_id=eq.${coreUserId}&select=id`
      )
      const existingReferral = Array.isArray(existingRefs) ? existingRefs[0] : null

      if (!existingReferral) {
        await supabaseREST('affiliates', 'referrals', 'POST', {
          affiliate_id: affiliateRow.id,
          referred_user_id: coreUserId,
        })
      }
    }
  }

  if (paymentId) {
    await supabaseAdmin.rpc('calculate_affiliate_commission', {
      p_referred_user_id: coreUserId,
      p_payment_id: paymentId,
      p_amount: (session.amount_total || 0) / 100,
    })
  }

  // Send subscription confirmation email
  if (authUser?.email) {
    const plan = session.amount_total === 89900 ? 'annual' : 'monthly'
    await sendSubscriptionConfirmationEmail(authUser.email, plan)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const period = getSubscriptionPeriod(subscription)
  await supabaseREST(
    'payments', 'subscriptions', 'PATCH',
    {
      status: subscription.status === 'active' ? 'active' : 'inactive',
      current_period_start: period.start,
      current_period_end: period.end,
    },
    `stripe_subscription_id=eq.${subscription.id}`
  )
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabaseREST(
    'payments', 'subscriptions', 'PATCH',
    {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    },
    `stripe_subscription_id=eq.${subscription.id}`
  )
}
