-- =====================================================
-- CORE USERS TABLES
-- =====================================================

-- USERS TABLE
create table core.users (
    id uuid primary key default gen_random_uuid(),

    auth_user_id uuid unique not null,

    email text not null,

    role core.user_role default 'student',

    created_at timestamptz default now(),

    updated_at timestamptz default now()
);


-- USER PROFILES
create table core.profiles (
    id uuid primary key default gen_random_uuid(),

    user_id uuid not null references core.users(id) on delete cascade,

    full_name text,

    avatar_url text,

    discord_id text,

    country text,

    timezone text,

    created_at timestamptz default now(),

    updated_at timestamptz default now()
);


-- USER ROLES TABLE
create table core.roles (
    id uuid primary key default gen_random_uuid(),

    name text unique not null,

    description text
);


-- USER ROLE ASSIGNMENTS
create table core.user_roles (
    id uuid primary key default gen_random_uuid(),

    user_id uuid references core.users(id) on delete cascade,

    role_id uuid references core.roles(id) on delete cascade
);


-- =====================================================
-- DEFAULT ROLES
-- =====================================================

insert into core.roles (name, description) values
('student','Academy student'),
('trainer','Content creator'),
('affiliate','Affiliate partner'),
('admin','Platform administrator'),
('super_admin','System owner');