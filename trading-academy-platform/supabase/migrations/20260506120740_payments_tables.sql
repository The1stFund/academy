-- =====================================================
-- PAYMENTS TABLES
-- =====================================================

-- PLANS
create table payments.plans (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    price_monthly numeric(10,2),
    price_yearly numeric(10,2),
    stripe_price_id_monthly text,
    stripe_price_id_yearly text,
    features jsonb default '[]',
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- SUBSCRIPTIONS
create table payments.subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references core.users(id) on delete cascade,
    plan_id uuid references payments.plans(id),
    stripe_subscription_id text unique,
    stripe_customer_id text,
    status payments.subscription_status default 'inactive',
    current_period_start timestamptz,
    current_period_end timestamptz,
    cancelled_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- PAYMENTS
create table payments.payments (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references core.users(id) on delete cascade,
    subscription_id uuid references payments.subscriptions(id),
    stripe_payment_intent_id text unique,
    amount numeric(10,2) not null,
    currency text default 'pln',
    status text not null,
    created_at timestamptz default now()
);

-- COUPONS
create table payments.coupons (
    id uuid primary key default gen_random_uuid(),
    code text unique not null,
    discount_percent integer,
    discount_amount numeric(10,2),
    max_uses integer,
    used_count integer default 0,
    expires_at timestamptz,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- COUPON USAGE
create table payments.coupon_usage (
    id uuid primary key default gen_random_uuid(),
    coupon_id uuid not null references payments.coupons(id),
    user_id uuid not null references core.users(id),
    used_at timestamptz default now(),
    unique(coupon_id, user_id)
);