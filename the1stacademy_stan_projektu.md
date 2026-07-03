# The1st Academy – Stan projektu (podsumowanie do kontynuacji w nowym wątku)

## Projekt
SaaS platforma edukacyjna dla traderów, język polski. Właściciel/developer: Jacek (solo).

## Stack
- Next.js (frontend dla studentów + crm dla admina), Supabase (DB/Auth), Stripe (płatności), Vercel (hosting), GitHub.

## Repo i hosting
- Repo: `https://github.com/The1stFund/academy.git`
- Supabase: `https://cosrhfdobsfdbxeemzyx.supabase.co`
- CRM (admin): `https://academy-azure-ten.vercel.app` (root: `crm`, projekt Vercel: `academy`)
- Frontend (student): `https://academy-frontend-eta-six.vercel.app` (root: `frontend`, projekt Vercel: `academy-frontend`)
- Lokalne ścieżki: `~/projects/the1stacademy/` → `crm/` i `frontend/`

## Stripe
- Tryb testowy, GBP, konto: The 1st Academy Ltd
- Webhook produkcyjny: `https://academy-azure-ten.vercel.app/api/stripe/webhook` (Active, 3 events)
- Plan miesięczny: `price_1TUUuw0tKvZv0CxQWE6ioZVv` (£49/msc)
- Plan roczny: `price_1TUV0x0tKvZv0CxQMzknD0zV` (£499/rok)

## Design system
- Czcionka: Montserrat, kolor akcentu: `#16db65`
- Styl: biały/jasny frontend, ciemny sidebar (`#111`), inspirowany eToro
- Logo: `the1stacademy_Logo_sygnet.svg` / `the1stacademy_Logo_sygnet_white.svg` w `frontend/public/`
- Ikony: Font Awesome (`@fortawesome/react-fontawesome`)

## Co jest GOTOWE ✅

### Frontend (student)
- Landing, `/login`, `/register`, `/dashboard`, `/courses`, `/courses/[courseId]/lesson/[lessonId]`, `/analysis`, `/leaderboard`, `/profile`, `/affiliate`, `/pricing`, `/checkout`
- `/dashboard` — przyciski zakupu dla zalogowanych bez subskrypcji, wywołują `/api/stripe/checkout` bezpośrednio
- `/analysis` — śledzenie aktywności przez `track_analysis_watched` RPC przy wejściu i kliknięciu analizy
- `/api/stripe/checkout` — tworzy Stripe Checkout Session

### CRM (admin)
- Dashboard, users, subscriptions, content, plans, affiliates, reports, settings
- System importu wideo z YouTube
- `/api/stripe/webhook` — **DZIAŁA END-TO-END** ✅
- `/api/cron/expire-subscriptions` — wygasza przeterminowane subskrypcje, Vercel Cron `0 2 * * *`

### Stripe checkout flow — GOTOWY ✅
- Zalogowany user → klik w dashboard → Stripe Checkout → płatność → dashboard z aktywną subskrypcją
- `referral_code` przez `?ref=KOD` w URL

## Baza danych — funkcje SQL (public schema, security definer)
- `public.get_core_user_id(p_auth_user_id uuid) → uuid`
- `public.upsert_subscription(p_user_id uuid, p_plan_id text, ...)` — p_plan_id jako TEXT (obsługuje pusty string "")
- `public.insert_payment(p_user_id uuid, ...)` → uuid
- `public.expire_subscriptions() → int` — ustawia status='inactive' dla wygasłych płatnych sub
- `public.track_analysis_watched(p_user_id uuid)` — upsert do academy.activity_tracking

## Kluczowe wnioski techniczne (KRYTYCZNE)
- **Supabase schema switching NIE DZIAŁA server-side** — `.schema('X')` i `{ db: { schema: 'X' } }` nie działają w Vercel server functions dla niestandardowych schematów
- **Jedyne niezawodne rozwiązanie:** `security definer` funkcje SQL w schemacie `public` + `supabaseAdmin.rpc()`
- **Uprawnienia:** `grant usage/all on schema X to service_role` — wymagane dla każdego niestandardowego schematu
- **Stripe metadata:** `plan_id` przychodzi jako `""` (pusty string), nie `null` — funkcja SQL musi to obsługiwać
- **Auth lookup:** `supabaseAdmin.auth.admin.getUserById(authUserId)`
- **Pliki z nawiasami w ścieżce** (np. `(dashboard)/`) — deploy przez `python3 script.py`, nigdy `bash`
- Supabase Auth: email confirmation WYŁĄCZONE

## Zmienne środowiskowe
### academy-frontend (Vercel)
- `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### academy (CRM, Vercel)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CRON_SECRET`

## Najbliższe kroki (w kolejności)
1. **Cron job — wygaszanie nieaktywnych darmowych kont** (kupon 100%, brak aktywności 7 dni)
2. **Redesign CRM** (panel admina) w spójnym stylu z frontendem
