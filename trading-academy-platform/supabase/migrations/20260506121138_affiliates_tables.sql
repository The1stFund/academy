-- =====================================================
-- AFFILIATES TABLES
-- =====================================================

-- AFFILIATES
create table affiliates.affiliates (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references core.users(id) on delete cascade,
    referral_code text unique not null,
    commission_percent numeric(5,2) default 20.00,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- REFERRALS
create table affiliates.referrals (
    id uuid primary key default gen_random_uuid(),
    affiliate_id uuid not null references affiliates.affiliates(id),
    referred_user_id uuid not null references core.users(id),
    created_at timestamptz default now()
);

-- COMMISSIONS
create table affiliates.commissions (
    id uuid primary key default gen_random_uuid(),
    affiliate_id uuid not null references affiliates.affiliates(id),
    payment_id uuid not null references payments.payments(id),
    amount numeric(10,2) not null,
    status text default 'pending',
    paid_at timestamptz,
    created_at timestamptz default now()
);