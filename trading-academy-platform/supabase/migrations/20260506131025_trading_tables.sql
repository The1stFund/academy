-- =====================================================
-- TRADING TABLES
-- =====================================================

-- TRADING ACCOUNTS
create table trading.accounts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references core.users(id) on delete cascade,
    account_name text not null,
    broker text,
    account_number text,
    currency text default 'USD',
    initial_balance numeric(15,2) default 0,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- TRADES
create table trading.trades (
    id uuid primary key default gen_random_uuid(),
    account_id uuid not null references trading.accounts(id) on delete cascade,
    user_id uuid not null references core.users(id) on delete cascade,
    symbol text not null,
    direction trading.trade_direction not null,
    entry_price numeric(15,5) not null,
    exit_price numeric(15,5),
    lot_size numeric(10,4) not null,
    profit_loss numeric(15,2),
    opened_at timestamptz not null,
    closed_at timestamptz,
    status text default 'open',
    created_at timestamptz default now()
);

-- TRADE JOURNAL
create table trading.trade_journal (
    id uuid primary key default gen_random_uuid(),
    trade_id uuid not null references trading.trades(id) on delete cascade,
    user_id uuid not null references core.users(id) on delete cascade,
    notes text,
    emotion text,
    setup_quality integer check (setup_quality between 1 and 10),
    screenshot_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- TRADE STATISTICS
create table trading.trade_statistics (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references core.users(id) on delete cascade,
    account_id uuid references trading.accounts(id),
    total_trades integer default 0,
    winning_trades integer default 0,
    losing_trades integer default 0,
    win_rate numeric(5,2),
    total_profit_loss numeric(15,2) default 0,
    max_drawdown numeric(15,2) default 0,
    roi numeric(10,2),
    updated_at timestamptz default now()
);

-- LEADERBOARD
create table trading.leaderboard (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references core.users(id) on delete cascade,
    period text not null,
    rank integer,
    roi numeric(10,2),
    win_rate numeric(5,2),
    total_profit_loss numeric(15,2),
    updated_at timestamptz default now(),
    unique(user_id, period)
);