# The1st Academy – Stan projektu (podsumowanie do kontynuacji w nowym wątku)

## Projekt
SaaS platforma edukacyjna dla traderów, język polski. Właściciel/developer: Jacek (solo).

## Stack
Next.js (frontend + crm), Supabase (DB/Auth), Stripe (płatności live USD), Vercel (hosting), GitHub, Resend (emaile), Discord (społeczność).

## Repo i hosting
- Repo: `https://github.com/The1stFund/academy.git`
- Supabase: `https://cosrhfdobsfdbxeemzyx.supabase.co`
- CRM: `https://admin.the1st.academy` (root: `crm`, projekt Vercel: `academy`)
- Frontend: `https://the1st.academy` (root: `frontend`, projekt Vercel: `academy-frontend`)
- Lokalne ścieżki: `~/projects/the1stacademy/` → `crm/` i `frontend/`

## Stripe — LIVE ✅
- USD, webhook: `https://admin.the1st.academy/api/stripe/webhook`
- Plan miesięczny: `price_1TpTuR0tKvZv0CxQbKsGZK9m` ($100/msc)
- Plan roczny: `price_1TpTuR0tKvZv0CxQuvBZQS9a` ($899/rok)
- Kupon testowy: `TEST100` (100% off — do archiwizacji po testach)

## Email — Resend ✅
- Domena: `mail.the1st.academy`, nadawca: `noreply@mail.the1st.academy`
- Email powitalny po rejestracji → CTA do `/dashboard`
- Email potwierdzający zakup po `checkout.session.completed`

## Discord — KOMPLETNY ✅
- Aplikacja: `The1st Academy` (Client ID: `1523713500952924230`)
- Server ID: `1340971540576997426`, Student Role ID: `1523723556993630298`
- OAuth flow: `/api/discord/connect` → `/api/discord/callback`
- Bot na serwerze z uprawnieniem `Manage Roles`
- Połączenie w dashboardzie studenta (przycisk "Połącz Discord")
- Automatyczne nadanie roli `Student` po połączeniu
- Automatyczne odebranie roli przy freeze/cancel przez CRM
- Automatyczne odebranie roli przy wygaśnięciu przez webhook Stripe
- Env: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_SERVER_ID`, `DISCORD_STUDENT_ROLE_ID`, `DISCORD_REDIRECT_URI` (w obu projektach Vercel)

## Role CRM
- `super_admin` — pełny dostęp
- `admin` — content, affiliates, reports
- `trainer` — tylko content

## Subskrypcje — statusy
- `active`, `frozen` (blokuje dostęp + ostrzeżenie + odbiera rolę Discord), `inactive`, `cancelled`, `past_due`

## Co jest GOTOWE ✅

### Frontend — `the1st.academy`
- Landing page mobile-first, ecosystem messaging
- Checkout flow live (rejestracja + Stripe)
- Dashboard: frozen/active status, sekcja Discord
- Kursy, analizy (tracking aktywności), leaderboard, profil, affiliate, pricing

### CRM — `admin.the1st.academy`
- Users: lista z subskrypcją i datą ważności, zmiana roli (przez RPC), ręczne nadawanie subskrypcji
- Subscriptions: zamrażanie, anulowanie, reaktywacja + odbieranie roli Discord
- Affiliates: panel wypłat
- Content, Plans, Reports, Settings (prowizje per rola)
- 3 crony: expire (2:00), revoke-inactive (3:00), check-promoter (4:00 1. dnia mies.)

### System afiliacyjny ✅
- Afiliant (25%), Promotor (40%), Koordynator (10%)
- Link polecający → `/checkout?ref=KOD`
- Panel wypłat w CRM

## Baza danych — funkcje SQL (public schema, security definer)
- `get_core_user_id`, `upsert_subscription`, `insert_payment`
- `expire_subscriptions`, `revoke_inactive_free_accounts`, `check_promoter_status`
- `track_analysis_watched`, `create_affiliate`, `get_affiliate_data`
- `increment_wallet_balance`, `calculate_affiliate_commission`
- `get_affiliates_with_wallets`, `get_payouts`, `process_payout`
- `manage_subscription` (cancel/freeze/reactivate)
- `get_subscriptions_with_users`, `get_users_with_subscriptions`
- `save_discord_connection`, `get_discord_id`
- `update_user_role`, `delete_user`

## Kluczowe wnioski techniczne (KRYTYCZNE)
- **Supabase schema switching NIE DZIAŁA server-side** → `security definer` SQL + `supabaseAdmin.rpc()`
- **Uprawnienia:** `grant usage/all on schema X to service_role` — dla `payments`, `affiliates`
- **Stripe metadata:** `plan_id` jako TEXT (obsługuje "")
- **Pliki z nawiasami w ścieżce** → deploy przez `python3 script.py`, nigdy `bash`
- Supabase Auth: email confirmation WYŁĄCZONE

## NASTĘPNY KROK — Licencjonowanie Hand Tradera

### Architektura
- EA działa **offline** z opcjonalnym pingiem API, blokada po **72h** bez połączenia
- Plik licencji powiązany z numerem konta MT4 (HMAC-SHA256)

### Dwa pliki do pobrania przez studenta
1. `The1st_HandTrader.ex4/.ex5` — EA, statyczny, przechowywany w Supabase Storage
2. `the1st_license.dat` — unikalny per konto MT4, generowany na żądanie

### Format pliku licencji
```
ACCOUNT=12345678
EXPIRES=2026-08-04
GENERATED=2026-07-05T19:00:00Z
SIGNATURE=abc123def456...
```

### Co budujemy (ten wątek)
- Tabela `trading.licenses` — `user_id`, `mt4_account`, `expires_at`, `generated_at`, `is_active`
- API `GET /api/license/verify?account=XXXXX` → `{valid: true/false, expires_at}`
- API `POST /api/license/generate` → generuje plik `.dat` z HMAC-SHA256
- Sekcja "Hand Trader" w dashboardzie studenta
- Panel uploadu EA w CRM (super_admin → Supabase Storage)

### Co w osobnym wątku (EA/bot)
- Kod MQL4/5: odczyt licencji, weryfikacja HMAC, blokada po 72h
- Parametryzacja pod konta fundowane
