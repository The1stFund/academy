-- =====================================================
-- ACADEMY CONTENT TABLES
-- =====================================================

-- MARKET POSTS
create table academy_content.market_posts (
    id uuid primary key default gen_random_uuid(),
    author_id uuid not null references core.users(id),
    title text not null,
    content text not null,
    tags text[],
    is_published boolean default false,
    published_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- MARKET COMMENTS
create table academy_content.market_comments (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references academy_content.market_posts(id) on delete cascade,
    author_id uuid not null references core.users(id),
    content text not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- =====================================================
-- NOTIFICATIONS TABLES
-- =====================================================

create table notifications.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references core.users(id) on delete cascade,
    title text not null,
    message text not null,
    type text default 'info',
    is_read boolean default false,
    created_at timestamptz default now()
);

-- =====================================================
-- CRM TABLES
-- =====================================================

create table crm.contacts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references core.users(id),
    full_name text not null,
    email text,
    phone text,
    status text default 'lead',
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create table crm.activities (
    id uuid primary key default gen_random_uuid(),
    contact_id uuid not null references crm.contacts(id) on delete cascade,
    admin_id uuid references core.users(id),
    activity_type text not null,
    description text,
    created_at timestamptz default now()
);