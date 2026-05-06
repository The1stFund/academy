-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- CORE.USERS
alter table core.users enable row level security;

create policy "Users can view own data"
on core.users for select
using (auth.uid() = auth_user_id);

create policy "Admins can view all users"
on core.users for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

-- CORE.PROFILES
alter table core.profiles enable row level security;

create policy "Users can view own profile"
on core.profiles for select
using (
    user_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

create policy "Users can update own profile"
on core.profiles for update
using (
    user_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

create policy "Admins can view all profiles"
on core.profiles for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

-- ACADEMY.COURSES
alter table academy.courses enable row level security;

create policy "Anyone can view published courses"
on academy.courses for select
using (is_published = true);

create policy "Trainers and admins can manage courses"
on academy.courses for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('trainer', 'admin', 'super_admin')
    )
);

-- ACADEMY.LESSONS
alter table academy.lessons enable row level security;

create policy "Subscribers can view lessons"
on academy.lessons for select
using (
    is_free_preview = true
    or exists (
        select 1 from payments.subscriptions s
        join core.users u on u.id = s.user_id
        where u.auth_user_id = auth.uid()
        and s.status = 'active'
    )
);

create policy "Trainers and admins can manage lessons"
on academy.lessons for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('trainer', 'admin', 'super_admin')
    )
);

-- ACADEMY.LESSON_PROGRESS
alter table academy.lesson_progress enable row level security;

create policy "Users can manage own progress"
on academy.lesson_progress for all
using (
    user_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

-- PAYMENTS.SUBSCRIPTIONS
alter table payments.subscriptions enable row level security;

create policy "Users can view own subscription"
on payments.subscriptions for select
using (
    user_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

create policy "Admins can manage all subscriptions"
on payments.subscriptions for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

-- PAYMENTS.PAYMENTS
alter table payments.payments enable row level security;

create policy "Users can view own payments"
on payments.payments for select
using (
    user_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

create policy "Admins can view all payments"
on payments.payments for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

-- AFFILIATES.AFFILIATES
alter table affiliates.affiliates enable row level security;

create policy "Affiliates can view own data"
on affiliates.affiliates for select
using (
    user_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

create policy "Admins can manage affiliates"
on affiliates.affiliates for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

-- AFFILIATES.COMMISSIONS
alter table affiliates.commissions enable row level security;

create policy "Affiliates can view own commissions"
on affiliates.commissions for select
using (
    affiliate_id in (
        select a.id from affiliates.affiliates a
        join core.users u on u.id = a.user_id
        where u.auth_user_id = auth.uid()
    )
);

-- TRADING.ACCOUNTS
alter table trading.accounts enable row level security;

create policy "Users can manage own trading accounts"
on trading.accounts for all
using (
    user_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

-- TRADING.TRADES
alter table trading.trades enable row level security;

create policy "Users can manage own trades"
on trading.trades for all
using (
    user_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

-- TRADING.TRADE_JOURNAL
alter table trading.trade_journal enable row level security;

create policy "Users can manage own journal"
on trading.trade_journal for all
using (
    user_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

-- TRADING.LEADERBOARD
alter table trading.leaderboard enable row level security;

create policy "Anyone can view leaderboard"
on trading.leaderboard for select
using (true);

create policy "System can manage leaderboard"
on trading.leaderboard for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

-- ACADEMY_CONTENT.MARKET_POSTS
alter table academy_content.market_posts enable row level security;

create policy "Subscribers can view published posts"
on academy_content.market_posts for select
using (
    is_published = true
    and exists (
        select 1 from payments.subscriptions s
        join core.users u on u.id = s.user_id
        where u.auth_user_id = auth.uid()
        and s.status = 'active'
    )
);

create policy "Trainers and admins can manage posts"
on academy_content.market_posts for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('trainer', 'admin', 'super_admin')
    )
);

-- NOTIFICATIONS.NOTIFICATIONS
alter table notifications.notifications enable row level security;

create policy "Users can view own notifications"
on notifications.notifications for select
using (
    user_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

create policy "Users can mark own notifications as read"
on notifications.notifications for update
using (
    user_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

-- CRM.CONTACTS
alter table crm.contacts enable row level security;

create policy "Admins can manage all contacts"
on crm.contacts for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

-- CRM.ACTIVITIES
alter table crm.activities enable row level security;

create policy "Admins can manage all activities"
on crm.activities for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);