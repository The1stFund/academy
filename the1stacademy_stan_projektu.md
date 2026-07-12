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

## Discord — KOMPLETNY ✅
- Client ID: `1523713500952924230`, Server ID: `1340971540576997426`, Student Role ID: `1523723556993630298`
- OAuth flow: `/api/discord/connect` → `/api/discord/callback`
- Automatyczne nadanie/odebranie roli `Student`

## Supabase Storage
- Bucket `ebooks` (private) — pliki PDF, ścieżka: tylko nazwa pliku np. `The 1st elementarz.pdf`
- Signed URL generowany dynamicznie (TTL 15 min), wyświetlany przez Google Docs Viewer
- Policy: `Authenticated users can read ebooks`

## Co jest GOTOWE ✅

### Frontend — `the1st.academy`
- Landing page, checkout flow live
- Dashboard: frozen/active, sekcja Discord
- Kursy, analizy, leaderboard, profil, affiliate, pricing
- `/ebooks` — biblioteka z podglądem PDF przez Google Docs Viewer

### CRM — `admin.the1st.academy`
- Users: lista z subskrypcją, zmiana roli (RPC), ręczne nadawanie subskrypcji
- Subscriptions: zamrażanie, anulowanie, reaktywacja + odbieranie roli Discord
- Affiliates: panel wypłat
- Content (kursy, analizy, ebooki), Plans, Reports, Settings
- 3 crony: expire, revoke-inactive, check-promoter

## Baza danych — funkcje SQL (public schema, security definer)
- `get_core_user_id`, `upsert_subscription`, `insert_payment`
- `expire_subscriptions`, `revoke_inactive_free_accounts`, `check_promoter_status`
- `track_analysis_watched`, `create_affiliate`, `get_affiliate_data`
- `increment_wallet_balance`, `calculate_affiliate_commission`
- `get_affiliates_with_wallets`, `get_payouts`, `process_payout`
- `manage_subscription`, `get_subscriptions_with_users`, `get_users_with_subscriptions`
- `save_discord_connection`, `get_discord_id`
- `update_user_role`, `delete_user`
- `get_published_ebooks`

## Kluczowe wnioski techniczne (KRYTYCZNE)
- **Supabase schema switching NIE DZIAŁA server-side** → `security definer` SQL + `supabaseAdmin.rpc()`
- **Uprawnienia:** `grant usage/all on schema X to service_role` — dla `payments`, `affiliates`
- **Pliki z nawiasami w ścieżce** → deploy przez `python3 script.py`, nigdy `bash`
- **Ebooki Storage:** `file_url` w bazie = tylko nazwa pliku (bez prefixu `ebooks/`)
- **PDF viewer:** Google Docs Viewer z signed URL działa w Safari
- Supabase Auth: email confirmation WYŁĄCZONE

## NASTĘPNY KROK — Licencjonowanie Hand Tradera
- Tabela `trading.licenses` — `user_id`, `mt4_account`, `expires_at`, `generated_at`, `is_active`
- API `GET /api/license/verify?account=XXXXX` → `{valid: true/false, expires_at}`
- API `POST /api/license/generate` → plik `.dat` z HMAC-SHA256
- Sekcja "Hand Trader" w dashboardzie studenta
- Panel uploadu EA w CRM (Supabase Storage)
- EA działa offline, ping co jakiś czas, blokada po 72h bez połączenia
- Kod EA w osobnym wątku GitHub
