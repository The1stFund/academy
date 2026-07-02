import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const supabaseCore = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'core' } }
)

const supabasePayments = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'payments' } }
)

const supabaseAffiliates = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'affiliates' } }
)

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

  // Use Auth Admin API to get user — avoids REST schema issues
  const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.admin.getUserById(authUserId)
  if (!authUser) {
    console.error('Auth user not found:', authError?.message)
    return
  }

  // Get core.users.id via raw fetch with Accept-Profile header
  // (supabase-js schema switching is unreliable in server functions)
  const coreUserResp = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?auth_user_id=eq.${authUserId}&select=id`,
    {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Accept-Profile': 'core',
      }
    }
  )
  const coreUsers = await coreUserResp.json()
  const coreUser = coreUsers?.[0]

  if (!coreUser) {
    console.error('Core user not found for auth_user_id:', authUserId)
    return
  }

  const stripeSubscriptionId = session.subscription as string
  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  const period = getSubscriptionPeriod(stripeSubscription)

  const { error: subError } = await supabasePayments
    .from('subscriptions')
    .upsert({
      user_id: coreUser.id,
      plan_id: planId || null,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: session.customer as string,
      status: 'active',
      current_period_start: period.start,
      current_period_end: period.end,
      is_free_via_coupon: isFreeViaCoupon,
    }, { onConflict: 'stripe_subscription_id' })

  if (subError) {
    console.error('Subscription upsert error:', subError.message)
  }

  const { data: paymentRecord, error: paymentError } = await supabasePayments
    .from('payments')
    .insert({
      user_id: coreUser.id,
      stripe_payment_intent_id: session.payment_intent as string,
      amount: (session.amount_total || 0) / 100,
      currency: session.currency || 'gbp',
      status: 'succeeded',
    })
    .select('id')
    .single()

  if (paymentError) {
    console.error('Payment insert error:', paymentError.message)
  }

  if (referralCode) {
    const { data: affiliateRow } = await supabaseAffiliates
      .from('affiliates')
      .select('id')
      .eq('referral_code', referralCode)
      .single()

    if (affiliateRow) {
      const { data: existingReferral } = await supabaseAffiliates
        .from('referrals')
        .select('id')
        .eq('referred_user_id', coreUser.id)
        .single()

      if (!existingReferral) {
        await supabaseAffiliates
          .from('referrals')
          .insert({
            affiliate_id: affiliateRow.id,
            referred_user_id: coreUser.id,
          })
      }
    }
  }

  if (paymentRecord) {
    await handleAffiliateCommission(coreUser.id, session, paymentRecord.id)
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const period = getSubscriptionPeriod(subscription)

  await supabasePayments
    .from('subscriptions')
    .update({
      status: subscription.status === 'active' ? 'active' : 'inactive',
      current_period_start: period.start,
      current_period_end: period.end,
    })
    .eq('stripe_subscription_id', subscription.id)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await supabasePayments
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
}

async function handleAffiliateCommission(userId: string, session: Stripe.Checkout.Session, paymentId: string) {
  const { data: affiliate } = await supabaseAffiliates
    .from('referrals')
    .select('affiliate_id')
    .eq('referred_user_id', userId)
    .single()

  if (!affiliate) return

  const { data: settings } = await supabaseAffiliates
    .from('commission_settings')
    .select('level, commission_percent')
    .eq('is_active', true)
    .order('level', { ascending: true })

  if (!settings || settings.length === 0) return

  const amount = (session.amount_total || 0) / 100
  const level1 = settings.find(s => s.level === 1)
  const level2 = settings.find(s => s.level === 2)
  const level3 = settings.find(s => s.level === 3)

  if (level1) {
    const commission1 = (amount * level1.commission_percent) / 100
    await supabaseAffiliates.from('commissions').insert({
      affiliate_id: affiliate.affiliate_id,
      payment_id: paymentId,
      amount: commission1,
      status: 'pending',
    })
    await supabaseAuth.rpc('increment_wallet_balance', {
      p_affiliate_id: affiliate.affiliate_id,
      p_amount: commission1,
    })
  }

  const { data: parentAffiliate } = await supabaseAffiliates
    .from('affiliates')
    .select('parent_affiliate_id')
    .eq('id', affiliate.affiliate_id)
    .single()

  if (parentAffiliate?.parent_affiliate_id && level2) {
    const commission2 = (amount * level2.commission_percent) / 100
    await supabaseAffiliates.from('commissions').insert({
      affiliate_id: parentAffiliate.parent_affiliate_id,
      payment_id: paymentId,
      amount: commission2,
      status: 'pending',
    })
    await supabaseAuth.rpc('increment_wallet_balance', {
      p_affiliate_id: parentAffiliate.parent_affiliate_id,
      p_amount: commission2,
    })

    const { data: grandParentAffiliate } = await supabaseAffiliates
      .from('affiliates')
      .select('parent_affiliate_id')
      .eq('id', parentAffiliate.parent_affiliate_id)
      .single()

    if (grandParentAffiliate?.parent_affiliate_id && level3) {
      const commission3 = (amount * level3.commission_percent) / 100
      await supabaseAffiliates.from('commissions').insert({
        affiliate_id: grandParentAffiliate.parent_affiliate_id,
        payment_id: paymentId,
        amount: commission3,
        status: 'pending',
      })
      await supabaseAuth.rpc('increment_wallet_balance', {
        p_affiliate_id: grandParentAffiliate.parent_affiliate_id,
        p_amount: commission3,
      })
    }
  }
}
