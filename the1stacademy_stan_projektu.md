# The1st Academy – Stan projektu (podsumowanie do kontynuacji w nowym wątku)

## Projekt
SaaS platforma edukacyjna dla traderów, język polski. Właściciel/developer: Jacek (solo).

## Stack
Next.js (frontend + crm), Supabase (DB/Auth), Stripe (płatności live), Vercel (hosting), GitHub, Resend (emaile).

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
- Email potwierdzający zakup: po `checkout.session.completed` przez webhook

## Co jest GOTOWE ✅

### Frontend (student) — `the1st.academy`
- Landing page (mobile-first, ecosystem messaging, bez fake stats)
- `/login`, `/register`, `/dashboard`, `/courses`, `/courses/[courseId]/lesson/[lessonId]`
- `/analysis` (śledzenie aktywności), `/leaderboard`, `/profile`, `/affiliate`, `/pricing`, `/checkout`
- Checkout flow: rejestracja + Stripe live w jednym kroku

### CRM (admin) — `admin.the1st.academy`
- Redesign: ciemny sidebar, Montserrat — spójny z frontendem
- Zabezpieczenie: tylko admin/trainer/super_admin
- Users, subscriptions, content, plans, affiliates (panel wypłat ✅), reports, settings
- Crony: expire-subscriptions (2:00), revoke-inactive-accounts (3:00), check-promoter-status (4:00 1. dnia mies.)

### System afiliacyjny — KOMPLETNY ✅
- Afiliant (standard): 25%, aktywuje samodzielnie
- Promotor: 40%, mianowany przez admina
- Koordynator: 10% z klientów swoich afiliantów/promotorów
- Panel wypłat w CRM: `get_affiliates_with_wallets()`, `process_payout()`

## Baza danych — funkcje SQL (public schema, security definer)
- `get_core_user_id`, `upsert_subscription`, `insert_payment`
- `expire_subscriptions`, `revoke_inactive_free_accounts`, `check_promoter_status`
- `track_analysis_watched`, `create_affiliate`, `get_affiliate_data`
- `increment_wallet_balance`, `calculate_affiliate_commission`
- `get_affiliates_with_wallets`, `get_payouts`, `process_payout`

## Kluczowe wnioski techniczne (KRYTYCZNE)
- **Supabase schema switching NIE DZIAŁA server-side** → `security definer` funkcje SQL + `supabaseAdmin.rpc()`
- **Uprawnienia:** `grant usage/all on schema X to service_role` — dla `payments`, `affiliates`
- **Stripe metadata:** `plan_id` jako TEXT (obsługuje "")
- **Pliki z nawiasami w ścieżce** → deploy przez `python3 script.py`, nigdy `bash`
- Supabase Auth: email confirmation WYŁĄCZONE

## Następny krok
**Licencjonowanie Hand Tradera:**
- EA (Expert Advisor MT4/MT5) jest gotowy
- Potrzebny: API endpoint który EA odpytuje przy starcie → weryfikuje czy MT4 account number ma aktywną subskrypcję
- Panel studenta: wpisanie MT4 account number, status licencji
- Pauza bota po przekroczeniu dziennego/tygodniowego DD
