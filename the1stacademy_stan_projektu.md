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
- Email powitalny po rejestracji, email potwierdzający zakup

## Discord ✅
- Aplikacja: `The1st Academy` (Client ID: `1523713500952924230`)
- Server ID: `1340971540576997426`
- Student Role ID: `1523723556993630298`
- OAuth flow: `/api/discord/connect` → `/api/discord/callback`
- Bot dodany na serwer z uprawnieniem `Manage Roles`
- Env variables: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_SERVER_ID`, `DISCORD_STUDENT_ROLE_ID`, `DISCORD_REDIRECT_URI`

## Role CRM
- `super_admin` — pełny dostęp
- `admin` — content, affiliates, reports
- `trainer` — tylko content

## Subskrypcje — statusy
- `active`, `frozen` (blokuje dostęp + ostrzeżenie), `inactive`, `cancelled`, `past_due`

## Co jest GOTOWE ✅

### Frontend — `the1st.academy`
- Landing page mobile-first, checkout flow live
- Dashboard: obsługa frozen/active, sekcja Discord (Połącz konto)
- Kursy, analizy, leaderboard, profil, affiliate, pricing

### CRM — `admin.the1st.academy`
- Users: lista z subskrypcją i datą ważności, zmiana roli inline, ręczne nadawanie subskrypcji
- Subscriptions: zamrażanie, anulowanie, reaktywacja
- Affiliates: panel wypłat
- Content, Plans, Reports, Settings (prowizje per rola)
- 3 crony: expire (2:00), revoke-inactive (3:00), check-promoter (4:00 1. dnia mies.)

### System afiliacyjny ✅
- Afiliant (25%), Promotor (40%), Koordynator (10%)

## Baza danych — funkcje SQL (public schema, security definer)
- `get_core_user_id`, `upsert_subscription`, `insert_payment`
- `expire_subscriptions`, `revoke_inactive_free_accounts`, `check_promoter_status`
- `track_analysis_watched`, `create_affiliate`, `get_affiliate_data`
- `increment_wallet_balance`, `calculate_affiliate_commission`
- `get_affiliates_with_wallets`, `get_payouts`, `process_payout`
- `manage_subscription` (cancel/freeze/reactivate)
- `get_subscriptions_with_users`, `get_users_with_subscriptions`
- `save_discord_connection`

## Kluczowe wnioski techniczne (KRYTYCZNE)
- **Supabase schema switching NIE DZIAŁA server-side** → `security definer` SQL + `supabaseAdmin.rpc()`
- **Uprawnienia:** `grant usage/all on schema X to service_role` — dla `payments`, `affiliates`
- **Stripe metadata:** `plan_id` jako TEXT (obsługuje "")
- **Pliki z nawiasami w ścieżce** → deploy przez `python3 script.py`, nigdy `bash`
- Supabase Auth: email confirmation WYŁĄCZONE

## NASTĘPNY KROK — Licencjonowanie Hand Tradera
### Co budujemy po stronie akademii (ten wątek)
- Tabela `trading.licenses` — `user_id`, `mt4_account`, `expires_at`, `generated_at`, `is_active`
- API `GET /api/license/verify?account=XXXXX` → `{valid: true/false, expires_at}`
- API `POST /api/license/generate` → generuje plik `.dat` z HMAC-SHA256
- Sekcja "Hand Trader" w dashboardzie: wpisanie MT4, pobieranie EA i licencji
- Panel uploadu EA w CRM (super_admin → Supabase Storage)
- EA działa offline, ping co jakiś czas, blokada po 72h bez połączenia

### Co w osobnym wątku (EA)
- Kod MQL4/5: odczyt licencji, weryfikacja HMAC, blokada po 72h
- Parametryzacja pod konta fundowane
