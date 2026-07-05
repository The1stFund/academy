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
- `frozen` — dostęp zablokowany, ostrzeżenie w dashboardzie
- `inactive` — brak dostępu
- `cancelled` — anulowana
- `past_due` — zaległa

## Co jest GOTOWE ✅

### Frontend (student) — `the1st.academy`
- Landing page (mobile-first, ecosystem messaging, bez fake stats)
- Pełny checkout flow (rejestracja + Stripe live)
- Dashboard z obsługą frozen/active status
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

## NASTĘPNY KROK — Licencjonowanie Hand Tradera (w tym wątku)

### Architektura
- EA działa **offline** z opcjonalnym pingiem API
- Bez połączenia z internetem EA działa max **72h**, potem blokada
- Plik licencji powiązany z numerem konta MT4 — nie można przekazać innej osobie

### Dwa pliki do pobrania przez studenta
1. **`The1st_HandTrader.ex4/.ex5`** — skompilowany EA, taki sam dla wszystkich, przechowywany w Supabase Storage
2. **`the1st_license.dat`** — unikalny per konto MT4, generowany na żądanie, zawiera HMAC-SHA256 podpis

### Format pliku licencji
```
ACCOUNT=12345678
EXPIRES=2026-08-04
GENERATED=2026-07-05T19:00:00Z
SIGNATURE=abc123def456...
```

### Co budujemy po stronie akademii (ten wątek)
- Tabela `trading.licenses` — `user_id`, `mt4_account`, `expires_at`, `generated_at`, `is_active`
- API `GET /api/license/verify?account=XXXXX` → `{valid: true/false, expires_at: "..."}`
- API `POST /api/license/generate` → generuje i zwraca plik `.dat`
- Sekcja "Hand Trader" w dashboardzie studenta — wpisanie numeru MT4, pobieranie EA i licencji
- Panel uploadu pliku EA w CRM (super_admin wgrywa nową wersję do Supabase Storage)

### Co budujemy po stronie EA (osobny wątek)
- Kod MQL4/5: odczyt pliku licencji, weryfikacja HMAC, ping API, blokada po 72h
- Parametryzacja pod konta fundowane (prop firm rules)
- Wszelkie zmiany w logice bota
