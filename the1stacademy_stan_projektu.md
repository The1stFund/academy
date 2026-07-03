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
- Styl: ciemny sidebar (`#111`), jasna treść, inspirowany eToro
- Logo: `the1stacademy_Logo_sygnet.svg` / `_white.svg` w `public/` obu projektów
- Ikony: Font Awesome (zainstalowany w obu projektach)

## Co jest GOTOWE ✅

### Frontend (student)
- Landing, `/login`, `/register`, `/dashboard`, `/courses`, `/courses/[courseId]/lesson/[lessonId]`, `/analysis`, `/leaderboard`, `/profile`, `/affiliate`, `/pricing`, `/checkout`
- Checkout flow: zalogowany user → Stripe → płatność → aktywna subskrypcja w dashboardzie
- Affiliate: panel z linkiem (`/checkout?ref=KOD`), wallet, prowizje
- Activity tracking na `/analysis`

### CRM (admin)
- Redesign: ciemny sidebar, Montserrat, Font Awesome — spójny z frontendem ✅
- Zabezpieczenie: tylko admin/trainer/super_admin ma dostęp ✅
- Users, subscriptions, content (courses + analysis), plans, affiliates, reports, settings
- Import wideo z YouTube
- `/api/stripe/webhook` — DZIAŁA END-TO-END ✅
- Crony: expire-subscriptions (2:00), revoke-inactive-accounts (3:00), check-promoter-status (4:00 1. dnia mies.)

### System afiliacyjny — KOMPLETNY ✅
- Afiliant (standard): 25%, aktywuje samodzielnie
- Promotor: 40%, mianowany przez admina, darmowy dostęp, wymaga 10 aktywnych klientów/msc
- Koordynator: 10% z klientów swoich afiliantów i promotorów, mianowany przez admina
- `calculate_affiliate_commission()` nalicza prowizje automatycznie przy zakupie

## Baza danych — funkcje SQL (public schema, security definer)
- `get_core_user_id(p_auth_user_id uuid) → uuid`
- `upsert_subscription(p_user_id uuid, p_plan_id text, ...) → uuid`
- `insert_payment(...) → uuid`
- `expire_subscriptions() → int`
- `revoke_inactive_free_accounts() → int`
- `check_promoter_status() → int`
- `track_analysis_watched(p_user_id uuid)`
- `create_affiliate(p_user_id uuid, p_referral_code text) → uuid`
- `get_affiliate_data(p_user_id uuid) → json`
- `increment_wallet_balance(p_affiliate_id uuid, p_amount numeric)`
- `calculate_affiliate_commission(p_referred_user_id uuid, p_payment_id uuid, p_amount numeric)`

## Kluczowe wnioski techniczne (KRYTYCZNE)
- **Supabase schema switching NIE DZIAŁA server-side** — jedyne rozwiązanie: `security definer` funkcje SQL w `public` + `supabaseAdmin.rpc()`
- **Uprawnienia:** `grant usage/all on schema X to service_role` — wymagane dla `payments` i `affiliates`
- **Stripe metadata:** `plan_id` przychodzi jako `""` — funkcja SQL obsługuje pusty string przez TEXT parametr
- **Auth lookup:** `supabaseAdmin.auth.admin.getUserById(authUserId)`
- **Pliki z nawiasami w ścieżce** (np. `(dashboard)/`) — deploy przez `python3 script.py`, nigdy `bash`
- Supabase Auth: email confirmation WYŁĄCZONE

## Przed launchem — do zrobienia
1. Przełączyć Stripe z trybu testowego na live (zmiana kluczy API i Price IDs)
2. Dodać domenę produkcyjną (zamiast `.vercel.app`)
3. Przetestować pełny flow na live Stripe
4. Panel wypłat w CRM (ręczne inicjowanie wypłat dla afiliantów)
5. Powiadomienia email (prowizja naliczona, subskrypcja wygasła)

## Zmienne środowiskowe
### academy-frontend
`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### academy (CRM)
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CRON_SECRET`
