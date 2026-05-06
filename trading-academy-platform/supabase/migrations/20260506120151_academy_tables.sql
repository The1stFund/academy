-- =====================================================
-- ACADEMY TABLES
-- =====================================================

-- COURSES
create table academy.courses (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    thumbnail_url text,
    is_published boolean default false,
    order_index integer default 0,
    created_by uuid references core.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- MODULES
create table academy.modules (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null references academy.courses(id) on delete cascade,
    title text not null,
    description text,
    order_index integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- LESSONS
create table academy.lessons (
    id uuid primary key default gen_random_uuid(),
    module_id uuid not null references academy.modules(id) on delete cascade,
    title text not null,
    content text,
    video_url text,
    duration_minutes integer,
    is_free_preview boolean default false,
    order_index integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- LESSON PROGRESS
create table academy.lesson_progress (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references core.users(id) on delete cascade,
    lesson_id uuid not null references academy.lessons(id) on delete cascade,
    completed boolean default false,
    completed_at timestamptz,
    created_at timestamptz default now(),
    unique(user_id, lesson_id)
);