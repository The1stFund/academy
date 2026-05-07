-- =====================================================
-- AFFILIATE SYSTEM EXTENDED
-- =====================================================

-- KONFIGURACJA POZIOMÓW PROWIZJI (ustawiana przez admina)
create table affiliates.commission_settings (
    id uuid primary key default gen_random_uuid(),
    level integer not null check (level between 1 and 3),
    commission_percent numeric(5,2) not null default 0,
    max_total_percent numeric(5,2) not null default 40,
    is_active boolean default true,
    updated_by uuid references core.users(id),
    updated_at timestamptz default now()
);

-- PORTFELE AFILIATÓW
create table affiliates.wallets (
    id uuid primary key default gen_random_uuid(),
    affiliate_id uuid not null references affiliates.affiliates(id) on delete cascade,
    balance numeric(15,2) default 0,
    pending_balance numeric(15,2) default 0,
    total_earned numeric(15,2) default 0,
    total_withdrawn numeric(15,2) default 0,
    minimum_payout numeric(10,2) default 50,
    currency text default 'GBP',
    updated_at timestamptz default now(),
    unique(affiliate_id)
);

-- WYPŁATY
create table affiliates.payouts (
    id uuid primary key default gen_random_uuid(),
    affiliate_id uuid not null references affiliates.affiliates(id),
    amount numeric(15,2) not null,
    currency text default 'GBP',
    status text default 'pending',
    notes text,
    processed_by uuid references core.users(id),
    processed_at timestamptz,
    created_at timestamptz default now()
);

-- SYSTEM PROMOTORÓW
create table affiliates.promoters (
    id uuid primary key default gen_random_uuid(),
    affiliate_id uuid not null references affiliates.affiliates(id) on delete cascade,
    coordinator_id uuid references affiliates.affiliates(id),
    status text default 'active',
    clients_this_month integer default 0,
    clients_total integer default 0,
    free_access_active boolean default true,
    conditions_check_date timestamptz,
    activated_at timestamptz default now(),
    activated_by uuid references core.users(id),
    updated_at timestamptz default now(),
    unique(affiliate_id)
);

-- KONFIGURACJA PROWIZJI PROMOTORÓW
create table affiliates.promoter_settings (
    id uuid primary key default gen_random_uuid(),
    promoter_commission_percent numeric(5,2) default 30,
    coordinator_commission_percent numeric(5,2) default 10,
    min_clients_monthly integer default 3,
    min_clients_total integer default 10,
    min_clients_period_months integer default 3,
    updated_by uuid references core.users(id),
    updated_at timestamptz default now()
);

-- DODAJ KOLUMNY DO AFFILIATES (poziomy i rodzic)
alter table affiliates.affiliates
    add column if not exists parent_affiliate_id uuid references affiliates.affiliates(id),
    add column if not exists affiliate_type text default 'standard',
    add column if not exists level integer default 1;

-- =====================================================
-- BIBLIOTEKA EBOOKÓW
-- =====================================================

create table academy.ebooks (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    cover_url text,
    file_url text not null,
    file_size_mb numeric(8,2),
    author text,
    is_published boolean default false,
    order_index integer default 0,
    created_by uuid references core.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- =====================================================
-- DOMYŚLNE USTAWIENIA PROWIZJI
-- =====================================================

insert into affiliates.commission_settings (level, commission_percent, max_total_percent) values
(1, 25.00, 40.00),
(2, 10.00, 40.00),
(3, 5.00, 40.00);

insert into affiliates.promoter_settings (
    promoter_commission_percent,
    coordinator_commission_percent,
    min_clients_monthly,
    min_clients_total,
    min_clients_period_months
) values (30.00, 10.00, 3, 10, 3);

-- =====================================================
-- RLS
-- =====================================================

alter table affiliates.commission_settings enable row level security;
create policy "Admins manage commission settings"
on affiliates.commission_settings for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);
create policy "Anyone can view commission settings"
on affiliates.commission_settings for select
using (true);

alter table affiliates.wallets enable row level security;
create policy "Affiliates view own wallet"
on affiliates.wallets for select
using (
    affiliate_id in (
        select a.id from affiliates.affiliates a
        join core.users u on u.id = a.user_id
        where u.auth_user_id = auth.uid()
    )
);
create policy "Admins manage all wallets"
on affiliates.wallets for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

alter table affiliates.payouts enable row level security;
create policy "Affiliates view own payouts"
on affiliates.payouts for select
using (
    affiliate_id in (
        select a.id from affiliates.affiliates a
        join core.users u on u.id = a.user_id
        where u.auth_user_id = auth.uid()
    )
);
create policy "Admins manage all payouts"
on affiliates.payouts for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

alter table affiliates.promoters enable row level security;
create policy "Promoters view own data"
on affiliates.promoters for select
using (
    affiliate_id in (
        select a.id from affiliates.affiliates a
        join core.users u on u.id = a.user_id
        where u.auth_user_id = auth.uid()
    )
);
create policy "Admins manage all promoters"
on affiliates.promoters for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

alter table affiliates.promoter_settings enable row level security;
create policy "Admins manage promoter settings"
on affiliates.promoter_settings for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);
create policy "Anyone can view promoter settings"
on affiliates.promoter_settings for select
using (true);

alter table academy.ebooks enable row level security;
create policy "Subscribers can view published ebooks"
on academy.ebooks for select
using (
    is_published = true
    and exists (
        select 1 from payments.subscriptions s
        join core.users u on u.id = s.user_id
        where u.auth_user_id = auth.uid()
        and s.status = 'active'
    )
);
create policy "Admins and trainers manage ebooks"
on academy.ebooks for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('trainer', 'admin', 'super_admin')
    )
);

-- GRANT PERMISSIONS
grant usage on schema affiliates to authenticated;
grant all on all tables in schema affiliates to authenticated;
grant usage on schema academy to authenticated;
grant all on all tables in schema academy to authenticated;