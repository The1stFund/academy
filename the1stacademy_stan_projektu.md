# The1st Academy – Stan projektu (podsumowanie do kontynuacji w nowym wątku)

## Projekt
SaaS platforma edukacyjna dla traderów, język polski. Właściciel/developer: Jacek (solo).

## Stack
- Next.js (frontend dla studentów + crm dla admina), Supabase (DB/Auth), Stripe (płatności), Vercel (hosting), GitHub.

## Repo i hosting
- Repo: `https://github.com/The1stFund/academy.git`
- Supabase: `https://cosrhfdobsfdbxeemzyx.supabase.co`
- CRM (admin): `https://academy-azure-ten.vercel.app` (root: `crm`)
- Frontend (student): `https://academy-frontend-eta-six.vercel.app` (root: `frontend`)
- Lokalne ścieżki: `~/projects/the1stacademy/` → `crm/` i `frontend/`

## Stripe
- Tryb testowy, GBP, konto: The 1st Academy Ltd
- Webhook produkcyjny: `https://academy-azure-ten.vercel.app/api/stripe/webhook` (Active, 3 events)
- Plan miesięczny: `price_1TUUuw0tKvZv0CxQWE6ioZVv` (£49/msc)
- Plan roczny: `price_1TUV0x0tKvZv0CxQMzknD0zV` (£499/rok)

## Design system (frontend studenta + landing)
- Czcionka: Montserrat
- Kolor akcentu: `#16db65`
- Styl: biały/jasny frontend, ciemny sidebar (`#111`), inspirowany eToro
- Logo: `the1stacademy_Logo_sygnet.svg` (na jasnym tle), `the1stacademy_Logo_sygnet_white.svg` (na ciemnym tle), w `frontend/public/`
- Ikony: Font Awesome (`@fortawesome/react-fontawesome`)

## Co jest GOTOWE

### Frontend (student)
- Landing page, `/login`, `/register`, `/dashboard`, `/courses`, `/courses/[courseId]/lesson/[lessonId]`, `/analysis`, `/leaderboard`, `/profile`, `/affiliate`, `/pricing`
- `/checkout?plan=monthly|annual` – dla nowych użytkowników (rejestracja + Stripe w jednym kroku)
- `/dashboard` – przyciski "Miesięczny £49/msc" i "Roczny £499/rok" dla zalogowanych bez subskrypcji, wywołują `/api/stripe/checkout` bezpośrednio
- `/api/stripe/checkout` – tworzy Stripe Checkout Session używając `auth.admin.getUserById` (nie REST DB)

### CRM (admin)
- Dashboard, users, subscriptions, content, plans, affiliates, reports, settings
- System importu wideo z YouTube
- Stripe webhook (`/api/stripe/webhook`) – **DZIAŁA END-TO-END** ✅

### Stripe checkout flow – GOTOWY ✅
- Zalogowany user → klik przycisku w dashboard → Stripe Checkout → płatność → powrót do dashboard z aktywną subskrypcją
- Webhook aktywuje subskrypcję w bazie po `checkout.session.completed`
- `referral_code` przekazywany przez `?ref=KOD` w URL checkout

## Baza danych – kluczowe tabele i funkcje

### Tabele
- `core.users` (kolumny: `id`, `auth_user_id`, `email`, `role`)
- `payments.subscriptions` – z kolumną `is_free_via_coupon`
- `payments.coupons` – z kolumną `stripe_coupon_id` (dodana w tej sesji)
- `academy.activity_tracking` – śledzenie aktywności tygodniowej
- `affiliates.affiliates`, `affiliates.referrals`, `affiliates.commissions`, `affiliates.wallets`

### Funkcje SQL (public schema, security definer)
- `public.get_core_user_id(p_auth_user_id uuid) → uuid` – lookup core.users.id przez auth_user_id
- `public.upsert_subscription(...)` – upsert do payments.subscriptions (omija RLS)
- `public.insert_payment(...)` – insert do payments.payments (omija RLS)

### RLS policies (dodane w tej sesji)
- `payments.subscriptions`: "Service role can manage all subscriptions" (for all to service_role)
- `payments.payments`: "Service role can manage all payments" (for all to service_role)

## Kluczowe wnioski techniczne (KRYTYCZNE)
- **Supabase schema switching NIE DZIAŁA server-side:** `.schema('X')` i `{ db: { schema: 'X' } }` w konstruktorze nie wysyłają poprawnie `Accept-Profile` header w Vercel server functions dla niestandardowych schematów
- **Rozwiązanie:** używać `security definer` funkcji SQL w schemacie `public` wywoływanych przez `supabaseAdmin.rpc()` – to jedyna niezawodna metoda zapisu do niestandardowych schematów z poziomu Next.js API routes
- **Auth lookup:** `supabaseAdmin.auth.admin.getUserById(authUserId)` zamiast REST DB query
- **Pliki z nawiasami w ścieżce** (np. `(dashboard)/`) – deploy przez `python3 script.py`, nigdy `bash`
- **Stripe webhook secret:** ustawiony jako `STRIPE_WEBHOOK_SECRET` w Vercel projekt `academy-azure-ten`
- Supabase Auth: email confirmation WYŁĄCZONE

## Najbliższe kroki (w kolejności)
1. **Cron job – wygaszanie przeterminowanych płatnych subskrypcji** (Supabase Edge Function lub Vercel Cron)
2. **Cron job – wygaszanie nieaktywnych darmowych kont** (kupon 100%, brak aktywności 7 dni)
3. **UI odznaczania obejrzenia analizy** w `/analysis` (analogicznie do `lesson_progress`)
4. **Redesign CRM** (panel admina) w spójnym stylu z frontendem
