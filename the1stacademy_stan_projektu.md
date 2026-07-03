# The1st Academy – Stan projektu (podsumowanie do kontynuacji w nowym wątku)

## Projekt
SaaS platforma edukacyjna dla traderów, język polski. Właściciel/developer: Jacek (solo).

## Stack
Next.js (frontend + crm), Supabase (DB/Auth), Stripe (płatności), Vercel (hosting), GitHub.

## Repo i hosting
- Repo: `https://github.com/The1stFund/academy.git`
- Supabase: `https://cosrhfdobsfdbxeemzyx.supabase.co`
- CRM: `https://academy-azure-ten.vercel.app` (root: `crm`, projekt Vercel: `academy`)
- Frontend: `https://academy-frontend-eta-six.vercel.app` (root: `frontend`, projekt Vercel: `academy-frontend`)
- Lokalne ścieżki: `~/projects/the1stacademy/` → `crm/` i `frontend/`

## Stripe
- Tryb testowy, GBP, konto: The 1st Academy Ltd
- Webhook: `https://academy-azure-ten.vercel.app/api/stripe/webhook` (Active, 3 events)
- Plan miesięczny: `price_1TUUuw0tKvZv0CxQWE6ioZVv` (£49/msc)
- Plan roczny: `price_1TUV0x0tKvZv0CxQMzknD0zV` (£499/rok)

## Design system
- Czcionka: Montserrat, kolor akcentu: `#16db65`
- Styl: biały/jasny frontend, ciemny sidebar (`#111`), inspirowany eToro
- Logo: `the1stacademy_Logo_sygnet.svg` / `_white.svg` w `frontend/public/`
- Ikony: Font Awesome

## Co jest GOTOWE ✅

### Frontend (student)
- Landing, `/login`, `/register` (czyta `?ref=`), `/dashboard`, `/courses`, `/courses/[courseId]/lesson/[lessonId]`, `/analysis`, `/leaderboard`, `/profile`, `/affiliate`, `/pricing`, `/checkout`
- Dashboard: przyciski zakupu bezpośrednio do Stripe
- Analysis: śledzenie aktywności przez `track_analysis_watched`
- Affiliate: panel z linkiem (`/checkout?ref=KOD`), wallet, prowizje, historia

### CRM (admin)
- Dashboard, users, subscriptions, content, plans, affiliates, reports, settings
- System importu wideo z YouTube
- `/api/stripe/webhook` — DZIAŁA END-TO-END ✅
- Crony: `expire-subscriptions` (2:00), `revoke-inactive-accounts` (3:00), `check-promoter-status` (4:00 1. dnia mies.)

### System afiliacyjny — KOMPLETNY ✅
Trzy role:
- **Afiliant** (standard) — 25%, aktywuje samodzielnie
- **Promotor** — 40%, mianowany przez admina, darmowy dostęp, wymaga 10 aktywnych klientów/msc
- **Koordynator** — 10% z klientów swoich afiliantów i promotorów, mianowany przez admina

Tabela `affiliates.affiliates` ma kolumny: `role`, `coordinator_id`, `commission_percent`
Prowizje naliczane przez `public.calculate_affiliate_commission()` przy każdym zakupie

## Baza danych — funkcje SQL (public schema, security definer)
- `public.get_core_user_id(p_auth_user_id uuid) → uuid`
- `public.upsert_subscription(p_user_id uuid, p_plan_id text, ...) → uuid` — p_plan_id TEXT (obsługuje "")
- `public.insert_payment(...) → uuid`
- `public.expire_subscriptions() → int`
- `public.revoke_inactive_free_accounts() → int`
- `public.check_promoter_status() → int`
- `public.track_analysis_watched(p_user_id uuid)`
- `public.create_affiliate(p_user_id uuid, p_referral_code text) → uuid`
- `public.get_affiliate_data(p_user_id uuid) → json`
- `public.increment_wallet_balance(p_affiliate_id uuid, p_amount numeric)`
- `public.calculate_affiliate_commission(p_referred_user_id uuid, p_payment_id uuid, p_amount numeric)`

## Kluczowe wnioski techniczne (KRYTYCZNE)
- **Supabase schema switching NIE DZIAŁA server-side** — jedyne rozwiązanie: `security definer` funkcje SQL w `public` + `supabaseAdmin.rpc()`
- **Uprawnienia:** `grant usage/all on schema X to service_role` — wymagane dla `payments` i `affiliates`
- **Stripe metadata:** `plan_id` przychodzi jako `""` — funkcja SQL obsługuje pusty string przez TEXT parametr
- **Auth lookup:** `supabaseAdmin.auth.admin.getUserById(authUserId)`
- **Pliki z nawiasami w ścieżce** (np. `(dashboard)/`) — deploy przez `python3 script.py`, nigdy `bash`
- Supabase Auth: email confirmation WYŁĄCZONE

## Zmienne środowiskowe
### academy-frontend
`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### academy (CRM)
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CRON_SECRET`

## Najbliższy krok
- **Redesign CRM** — panel admina w spójnym stylu z frontendem (zaplanowane, jeszcze nie zaczęte)
