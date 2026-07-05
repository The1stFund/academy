# The1st Academy – Stan projektu (podsumowanie do kontynuacji w nowym wątku)

## Projekt
SaaS platforma edukacyjna dla traderów, język polski. Właściciel/developer: Jacek (solo).

## Stack
Next.js (frontend + crm), Supabase (DB/Auth), Stripe (płatności live USD), Vercel (hosting), GitHub, Resend (emaile).

## Repo i hosting
- Repo: `https://github.com/The1stFund/academy.git`
- Supabase: `https://cosrhfdobsfdbxeemzyx.supabase.co`
- CRM: `https://admin.the1st.academy` (root: `crm`, projekt Vercel: `academy`)
- Frontend: `https://the1st.academy` (root: `frontend`, projekt Vercel: `academy-frontend`)
- Lokalne ścieżki: `~/projects/the1stacademy/` → `crm/` i `frontend/`

## Stripe — LIVE ✅
- Konto: The 1st Academy Ltd, USD
- Webhook: `https://admin.the1st.academy/api/stripe/webhook` (Active, live)
- Plan miesięczny: `price_1TpTuR0tKvZv0CxQbKsGZK9m` ($100/msc)
- Plan roczny: `price_1TpTuR0tKvZv0CxQuvBZQS9a` ($899/rok)
- Kupon testowy: `TEST100` (100% off, max 5 użyć, live mode)

## Email — Resend ✅
- Domena: `mail.the1st.academy` (zweryfikowana)
- Nadawca: `noreply@mail.the1st.academy`
- Email powitalny: po rejestracji → CTA do `/dashboard`
- Email potwierdzający zakup: po `checkout.session.completed`

## Role CRM
- `super_admin` — pełny dostęp (users, subscriptions, plans, settings, affiliates, reports, content)
- `admin` — content, affiliates, reports
- `trainer` — tylko content

## Subskrypcje — statusy
- `active` — pełny dostęp
- `frozen` — dostęp zablokowany, widoczne ostrzeżenie w dashboardzie
- `inactive` — brak dostępu
- `cancelled` — anulowana
- `past_due` — zaległa

## Co jest GOTOWE ✅

### Frontend (student) — `the1st.academy`
- Landing page (mobile-first, ecosystem messaging)
- Pełny checkout flow (rejestracja + Stripe live)
- Dashboard z obsługą frozen status
- Kursy, analizy (tracking aktywności), leaderboard, profil, affiliate, pricing

### CRM (admin) — `admin.the1st.academy`
- Role-based sidebar (super_admin widzi wszystko)
- Subskrypcje: zamrażanie, anulowanie, reaktywacja z modalem potwierdzenia
- Afiliacja: panel wypłat (get_affiliates_with_wallets, process_payout)
- Content, Users, Plans, Reports, Settings (prowizje per rola)
- 3 crony: expire (2:00), revoke-inactive (3:00), check-promoter (4:00 1. dnia mies.)

### System afiliacyjny — KOMPLETNY ✅
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
- `get_subscriptions_with_users`

## Kluczowe wnioski techniczne (KRYTYCZNE)
- **Supabase schema switching NIE DZIAŁA server-side** → `security definer` SQL + `supabaseAdmin.rpc()`
- **Uprawnienia:** `grant usage/all on schema X to service_role` — dla `payments`, `affiliates`
- **Stripe metadata:** `plan_id` jako TEXT (obsługuje "")
- **Pliki z nawiasami w ścieżce** → deploy przez `python3 script.py`, nigdy `bash`
- Supabase Auth: email confirmation WYŁĄCZONE

## Następne sesje
1. **Hand Trader EA** — osobny wątek: licencjonowanie (API endpoint weryfikujący MT4 account), parametry kont fundowanych, pauza po DD
2. **Drobne poprawki** — treści, UX, edge cases
