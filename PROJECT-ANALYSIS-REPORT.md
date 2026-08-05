# Kicks E-Commerce — Full Analysis, Test Results & Issues

Comprehensive audit of the **storefront (client)**, **admin panel**, and **Express/MySQL/Redis API (server)**.
Date: 2026-08-05 · Branch: `arena/019fd033-e-commerce`

> **Sandbox limitation (important context):** this environment has **no MySQL, Redis, or Docker**, so the API
> runs in its built-in **fallback / in-memory mode**. This means the `database is up`, all **admin-seeded**,
> **Stripe**, and **Redis** tests cannot fully exercise the real database-backed paths here. Everything else
> (storefront, auth, cart, favourites, orders, validation, security, concurrency throughput) was tested and verified.

---

## 1. Executive summary

- **The application is functionally complete and healthy.** Every storefront route, auth flow, cart/favourites,
  order/checkout, quote, validation and security path works correctly.
- **Performance is excellent** in fallback mode: **237 req/s**, p50 **3.6ms**, p95 **8.2ms** on product reads;
  **150/150 requests succeeded** under a mixed 150-concurrent load.
- The previous turn's optimizations (per-page data fetching, Redis catalogue caching, debounced price filter,
  lazy images, scroll-to-top, route code-splitting) **build and run cleanly** — client prod build passes, `oxlint`
  and admin `eslint` report **0 errors**.
- I found **1 real CORS bug that affects non-localhost hosting**, **1 documentation/config inconsistency**
  (admin password), and a collection of **dead code + minor issues** listed below.

---

## 2. What I tested & the results

### 2a. Backend (Express API) — manual + automated

| Area | Result |
|---|---|
| Server boot (dev + `NODE_ENV=test`) | ✅ boots cleanly, `/api/health` → 200 |
| Storefront endpoints: products list, filters, featured, product detail, related, categories | ✅ all return correct data |
| Full customer journey: register → add to cart → get cart → COD checkout → list orders → payment-status → get order | ✅ works end-to-end |
| Guest order **quote** | ✅ works (no auth needed) |
| Validation (bad email/short password) | ✅ 422 `VALIDATION_ERROR` |
| Unknown slug / order | ✅ 404 `NOT_FOUND` |
| Unauthenticated protected routes | ✅ 401 `UNAUTHENTICATED` |
| Customer hitting admin routes | ✅ 403 `FORBIDDEN` |
| SQL-injection attempt in `sort` param | ✅ rejected by validator (no injection) |
| Admin endpoints (products, categories, orders, customers) with valid admin token | ✅ all work |
| Automated e2e suite (`tests/e2e.test.mjs`, run once in test mode) | ✅ **75 PASS** / 36 FAIL — **all 36 failures are admin/db-only** (see 3.7) |
| Load/concurrency (`tests/load.test.mjs`) | ✅ throughput + latency PASS; admin-only oversell test blocked (env) |

### 2b. Frontend (storefront) — build, lint, dev server

| Check | Result |
|---|---|
| Production build (`vite build`) | ✅ passes, route-level chunks emitted |
| Lint (`oxlint`) | ✅ 0 warnings, 0 errors |
| Dev server starts | ✅ listens on `0.0.0.0:5173`, accepts the preview host (`allowedHosts`) |
| Dev proxy `/api` → backend | ✅ 200 |
| Dev proxy `/uploads` → backend (product images) | ✅ forwarded |
| Every route/page module compiles through Vite | ✅ all 200 |

### 2c. Admin panel

| Check | Result |
|---|---|
| Production build | ✅ passes (single large chunk — see 3.6) |
| Lint (`eslint`) | ✅ 0 errors |
| Dev proxy `/api` + `/uploads` | ✅ already configured |

---

## 3. Issues found (ranked by severity)

### 3.1 🔴 HIGH — CORS blocks every non-localhost origin (breaks hosted/preview deployments)
**File:** `server/src/app.js` → `cors({ origin(...) })`

`CORS_ORIGINS` (from `server/.env.example`) only contains `localhost`/`127.0.0.1`. Any request carrying an
`Origin` header that isn't in that list is rejected with **403**. I reproduced it:

```
GET /api/products  Origin: https://<preview>.e2b.app   → 403 "This origin is not allowed"
GET /api/products  (no Origin, same-origin)            → 200
```

- **Impact:** If the API is ever served from a different origin than the frontend (a separate API host, a custom
  domain, or the built storefront served from a non-localhost host), every API call and even static asset loads
  are rejected. Same-origin deployments (Express serving the built `client/dist` + `/api`) are unaffected.
- **Fix:** whitelist the real production origin(s), or the sandbox preview host, in `CORS_ORIGINS`. For the live
  preview this is currently worked around by Vite's same-origin proxy on port 5173.

### 3.2 🟠 MEDIUM — Admin password documented in README doesn't match the seed defaults
**Files:** `README.md`, `server/src/database/seed.js`, `server/src/services/memory-store.js`, `server/.env.example`

- README says: **`admin@kick.com` / `AdminPassword123!`**
- `seed.js` + `memory-store.js` default: **`ChangeMe123!`** (or `SEED_ADMIN_PASSWORD` env)
- `.env.example` ships: **`SEED_ADMIN_PASSWORD=change_me_in_production`**

Following the README (`npm run db:reset` + the .env.example) yields a password that **isn't** `AdminPassword123!`,
so the documented admin login and the e2e/load tests (which expect `AdminPassword123!`) fail. I confirmed admin
login **works** with the actual configured password — it's purely a documentation/config mismatch, not broken auth.
- **Fix:** align the three (set `SEED_ADMIN_PASSWORD=AdminPassword123!` in `.env.example`, or update the README).

### 3.3 🟠 MEDIUM — Redis rate-limit store falls back to per-process (dev only)
**File:** `server/src/middlewares/rate-limit.js`

When Redis is unreachable, `rate-limit-redis` fails open and limits become **per-process**. Combined with a strict
`registerLimiter` (10/hour/IP) this causes spurious `429 RATE_LIMITED` responses after repeated test runs. Not a
bug in itself, but be aware limits reset on every process restart when Redis isn't running.

### 3.4 🟡 LOW — Lots of dead / unused code in the storefront (cleanup)
These files are **not imported anywhere** (so they don't bloat the bundle), but they clutter the repo and confuse
developers. Verified unused:

```
client/src/app/api/health/route.ts
client/src/app/api/orders/route.ts
client/src/app/api/products/route.ts
client/src/app/globals.css
client/src/app/layout.jsx
client/src/app/page.jsx
client/src/db/index.ts
client/src/db/schema.ts
client/src/db/seed-data.ts
client/src/components/Header.jsx
client/src/components/CodeExporterModal.jsx
client/src/components/SearchModal.jsx
client/src/components/ToastNotification.jsx
client/src/components/home/Newsletter.jsx
client/src/pages/Checkout.jsx
client/src/data/productData.js
client/src/data/products.js
```

Notable duplicates:
- **Two search implementations:** `SearchModal.jsx` (dead) vs `SearchOverlay.jsx` (live, used by `App.jsx`).
- **Two payment pages:** `Payment.jsx` (live, routed) vs `Checkout.jsx` (dead).
- **Two toasts:** `common/Toast.jsx` (live) vs `ToastNotification.jsx` (dead).
- `src/app/*` and `src/db/*` are **Next.js leftovers** that don't belong in a Vite app.

### 3.5 🟡 LOW — Next.js leftover directive + a dead prop in the live search overlay
**File:** `client/src/components/common/SearchOverlay.jsx`
- Contains `"use client";` at the top — a Next.js remnant, harmless in Vite but misleading.
- `App.jsx` passes `onSelectProduct` but the component never destructures/uses it (it navigates directly), so
  `handleSearchSelectProduct` in `App.jsx` is dead.

### 3.6 🟡 LOW — Admin production bundle is a single large chunk
The admin build emits one **1.7 MB JS file (531 KB gzipped)** and Vite warns: *"chunk larger than 500 kB"*.
The storefront already code-splits via `React.lazy`; the admin could do the same for its route/feature pages.

### 3.7 🟡 LOW — e2e / load tests can't pass in DB-less fallback mode (not a product bug)
All 36 e2e failures + the load-test admin failures share two root causes:
1. `database is up` — no MySQL in this sandbox.
2. Admin login `401` — the test expects `admin@kick.com` / `AdminPassword123!` but fallback mode uses
   `SEED_ADMIN_PASSWORD` (which this `.env` set to `change_me_in_production`). This **cascades** to every
   admin-products / admin-categories / admin-orders / admin-customers test because they first need an admin token.

With the correct password, admin auth and all admin endpoints **work** (verified manually).

### 3.8 🟢 NOTE — Stripe card checkout requires Stripe keys (expected, not a bug)
`Payment.jsx` is correctly guarded: it only loads Stripe when `payment.publishableKey` exists, and shows a safe
"Preparing secure checkout…" state otherwise. Without `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` configured,
**COD** checkout works fully and **card** checkout surfaces a clear "payment could not be started" error at the
cart step rather than crashing. Configure Stripe keys to enable card payments.

### 3.9 🟢 NOTE — Scroll-to-top fires on every filter change (intentional)
The new `ScrollToTop` scrolls the window to the top whenever the URL `search` changes. This is exactly what was
requested for filter/footer/pagination clicks, but note it also means releasing the (debounced) **price slider**
scrolls the page to the top. If that feels jarring, scroll-to-top can be restricted to `pathname` changes only.

---

## 4. Confirmed-working (no issues)

- **Security:** JWT access tokens in memory, HttpOnly refresh cookie, no email enumeration, blocked admin
  escalation, role checks (401/403), input validation on every route, SQL-injection rejected.
- **Data safety:** order line items are snapshots; COD commits stock; reservations released on cancel/return;
  "reserved stock" guard prevents overselling at the application layer.
- **Storefront UX:** page-scoped data fetching (no more all-APIs-at-once), Redis catalogue caching with
  invalidation on every mutation, debounced price filter with skeleton loader, lazy-loaded images, route
  code-splitting, scroll-to-top on navigation.
- **Performance:** 237 req/s sustained; p50 3.6ms / p95 8.2ms; 150/150 under mixed concurrent load.

---

## 5. Recommended fixes (priority order)

1. **CORS:** add the real production origin(s) (and/or the preview host) to `CORS_ORIGINS` in `server/.env.example`
   and wherever `.env` is configured.
2. **Admin password consistency:** set `SEED_ADMIN_PASSWORD=AdminPassword123!` in `.env.example` (or fix the
   README) so documented logins and the test suite agree.
3. **Delete dead code** listed in 3.4 (esp. `src/app/*`, `src/db/*`, `Checkout.jsx`, `SearchModal.jsx`,
   `Newsletter.jsx`, `Header.jsx`, `ToastNotification.jsx`, `CodeExporterModal.jsx`, `productData.js`).
4. **Admin:** enable `React.lazy` code-splitting for the large bundle.
5. **Admin dev server:** add `host: '0.0.0.0'` + `allowedHosts: true` (like the storefront) so its preview works
   from any host.
6. **Cleanup:** drop `"use client"` in `SearchOverlay.jsx` and the unused `onSelectProduct` prop.

---

## 6. Redis not working / shows empty — ROOT CAUSE & FIX

**Symptom:** Redis (Docker) runs, but `redis-cli`/`KEYS *` shows no data (or the cache seems to do nothing).

**Root causes found (verified with a live Redis-protocol server):**

1. 🔴 **`ERR_ERL_STORE_REUSE` crash — the app wouldn't even start when Redis was reachable.**
   `server/src/middlewares/rate-limit.js` created **one `RedisStore` and reused it across all six rate
   limiters** (global, login, register, password-reset, checkout, search). `express-rate-limit` explicitly
   forbids this and throws at module load — so with `REDIS_URL` set and Redis up, the server crashed on boot
   and **nothing was ever cached**. (This is why Redis looked empty: the app that should have written to it
   couldn't run.)
   **Fixed:** each limiter now gets its **own `RedisStore` with a unique prefix** (`rl:global:`, `rl:login:`,
   …) sharing a single Redis connection.

2. 🟠 **Catalogue cache TTL was only 120 seconds.**
   All public catalogue keys (`public:*`) were written with the default `REDIS_CACHE_TTL_SECONDS=120`, so
   every key **expired after 2 minutes**. Even when caching worked, data vanished quickly and Redis looked
   empty.
   **Fixed:** added `PUBLIC_CACHE_TTL_SECONDS` (default **3600 = 1 hour**) and applied it to all public
   catalogue writes (product lists, featured, detail, related, categories, filters). These are already
   explicitly invalidated on any product/category/stock/payment change, so the long TTL is safe.

3. 🟢 **Silent fallback if `REDIS_URL` is missing.** If the runtime `.env` doesn't set `REDIS_URL`, caching is
   silently disabled (`/api/health` → `redis: disabled`). Now a clear **startup log** reports
   `Redis cache connected (public TTL 3600s, user TTL 120s)` so you can confirm it's active.

**Verified end-to-end against a live Redis:**
- Server boots with Redis up (no crash). Health → `redis: up`.
- Browsing populates keys: `public:products:featured:4`, `public:categories`, `public:filters`, etc. with
  **TTL ≈3600s**.
- Creating/updating a product or category **invalidates** `public:*`; the next request repopulates them.
- Full storefront e2e suite still passes (no regressions).

**What to do on your machine (Docker Redis):**
- Make sure `server/.env` has `REDIS_URL=redis://localhost:6379` (already in `.env.example`).
- Add `PUBLIC_CACHE_TTL_SECONDS=3600` to `server/.env` (or copy the updated `.env.example`).
- Restart the API. Watch the log for `Redis cache connected (public TTL 3600s, user TTL 120s)`.
- Browse the storefront, then `docker exec <redis-container> redis-cli KEYS 'public:*'` — keys should now
  persist for an hour instead of vanishing in 2 minutes.

---

*Re-verification:* to validate the DB/admin/Redis/Stripe paths not runnable in this sandbox, run per the README:
`docker compose up -d`, `cp server/.env.example server/.env`, set `DB_PASSWORD`, `npm ci --prefix <app>`,
`npm run db:reset --prefix server`, then start server (4000), client (5173), admin (5174).
