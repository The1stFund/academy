-- =====================================================
-- RLS FOR MISSING TABLES
-- =====================================================

-- ACADEMY.MODULES
alter table academy.modules enable row level security;

create policy "Anyone can view modules of published courses"
on academy.modules for select
using (
    course_id in (
        select id from academy.courses where is_published = true
    )
);

create policy "Trainers and admins can manage modules"
on academy.modules for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('trainer', 'admin', 'super_admin')
    )
);

-- ACADEMY_CONTENT.MARKET_COMMENTS
alter table academy_content.market_comments enable row level security;

create policy "Subscribers can view comments"
on academy_content.market_comments for select
using (
    exists (
        select 1 from payments.subscriptions s
        join core.users u on u.id = s.user_id
        where u.auth_user_id = auth.uid()
        and s.status = 'active'
    )
);

create policy "Subscribers can add comments"
on academy_content.market_comments for insert
with check (
    exists (
        select 1 from payments.subscriptions s
        join core.users u on u.id = s.user_id
        where u.auth_user_id = auth.uid()
        and s.status = 'active'
    )
);

create policy "Users can update own comments"
on academy_content.market_comments for update
using (
    author_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

create policy "Users can delete own comments"
on academy_content.market_comments for delete
using (
    author_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

-- AFFILIATES.REFERRALS
alter table affiliates.referrals enable row level security;

create policy "Affiliates can view own referrals"
on affiliates.referrals for select
using (
    affiliate_id in (
        select a.id from affiliates.affiliates a
        join core.users u on u.id = a.user_id
        where u.auth_user_id = auth.uid()
    )
);

create policy "Admins can manage all referrals"
on affiliates.referrals for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

-- CORE.ROLES
alter table core.roles enable row level security;

create policy "Anyone can view roles"
on core.roles for select
using (true);

create policy "Admins can manage roles"
on core.roles for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

-- CORE.USER_ROLES
alter table core.user_roles enable row level security;

create policy "Users can view own roles"
on core.user_roles for select
using (
    user_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

create policy "Admins can manage user roles"
on core.user_roles for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

-- PAYMENTS.COUPONS
alter table payments.coupons enable row level security;

create policy "Anyone can view active coupons"
on payments.coupons for select
using (is_active = true);

create policy "Admins can manage coupons"
on payments.coupons for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

-- PAYMENTS.COUPON_USAGE
alter table payments.coupon_usage enable row level security;

create policy "Users can view own coupon usage"
on payments.coupon_usage for select
using (
    user_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

create policy "Admins can view all coupon usage"
on payments.coupon_usage for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

-- PAYMENTS.PLANS
alter table payments.plans enable row level security;

create policy "Anyone can view active plans"
on payments.plans for select
using (is_active = true);

create policy "Admins can manage plans"
on payments.plans for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);

-- TRADING.TRADE_STATISTICS
alter table trading.trade_statistics enable row level security;

create policy "Users can view own statistics"
on trading.trade_statistics for select
using (
    user_id in (
        select id from core.users where auth_user_id = auth.uid()
    )
);

create policy "System can manage all statistics"
on trading.trade_statistics for all
using (
    exists (
        select 1 from core.users u
        where u.auth_user_id = auth.uid()
        and u.role in ('admin', 'super_admin')
    )
);