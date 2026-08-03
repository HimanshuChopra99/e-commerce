# KICKS e-commerce product-readiness audit

**Audit date:** 2026-08-03  
**Scope:** storefront (`client`), admin portal (`admin`), Express/MySQL API (`server`), schema, auth, checkout, payments, concurrency, static code review, builds and dependency audit.

> This is a substantial code and runtime review, not a claim that any system can be proven “100% bug-free.” Production readiness also requires staging with real MySQL/Stripe/email/shipping providers, browser/device accessibility tests, load tests against production-like infrastructure, penetration testing, monitoring and operational rehearsals.

## Executive verdict

**Not production-ready for real payments or an Amazon/Flipkart-scale launch.** The project has a good starting API shape—server-side price calculation, input validation, role checks, transactions/row locking, and an e2e suite are positive—but there are blocking flaws in checkout/payment completion, inventory integrity, database-failure handling, administration, and customer-review functionality.

Do **not** accept live card orders until the Blockers and Critical findings below are resolved and re-tested with a real database and Stripe test mode.

## What was actually tested

| Check | Result |
|---|---|
| Storefront production build | **Pass** (`vite build`) |
| Storefront lint | **Pass with 18 warnings** |
| Server dependency installation | **Pass**, but Multer 1.x deprecation warning |
| API end-to-end suite, fallback-memory mode | **131 passed, 1 failed**; the only failed assertion was expected because MySQL/Docker is unavailable in this environment (`database is up`) |
| Admin install/build/lint | **Blocked:** `npm ci` fails because `admin/package-lock.json` is out of sync with `package.json` |
| Server production dependency audit | **0 vulnerabilities reported** |
| Client production dependency audit | **2 high vulnerabilities** in `react-router` / `react-router-dom` |
| Real MySQL, Stripe webhook, Stripe Elements, email, Redis, Docker, browser/device, load test | **Not executable here**: Docker is not installed, and no external service credentials/test environment are supplied |

The API suite did exercise registration/login, token refresh, role restrictions, validation, product/category/admin operations, order ownership/IDOR protection, soft deletion, state transitions and a two-request oversell race. That is useful coverage, but it ran against the project’s in-memory fallback rather than MySQL.

---

# Findings

Severity uses **Blocker / Critical / High / Medium / Low**. “Blocker” means a live commerce launch should stop until fixed.

## Blockers

### B-01 — Card checkout does not collect or confirm payment
**Area:** Storefront checkout and payment integration  
**Evidence:** `client/src/components/cart/ShoppingCart.jsx`, `client/src/lib/api.js`, `server/src/controllers/order.controller.js`

The cart creates an order, clears the cart, and immediately routes the customer to `/orders`. The server may return a Stripe `clientSecret`, but the storefront neither loads Stripe.js/Elements nor confirms the PaymentIntent, handles 3DS/SCA, polling, payment failure, retry, or payment confirmation. `ordersApi` also exposes neither `pay()` nor `paymentStatus()` even though the API has those routes.

**Impact:** A shopper selecting “card” can receive an order confirmation-like flow without paying. Orders remain `pending`/unpaid with reserved stock until expiry. This is a direct revenue, customer-trust, fulfilment, and inventory risk.

**Fix:** Build a dedicated payment step using Stripe Payment Element, confirm client-side with the returned client secret, show pending/succeeded/failed states, poll or await webhook-confirmed status, do not call it an order confirmation before payment succeeds, and keep the cart recoverable on failure. Test 3DS, declined card, browser refresh, duplicated click, webhook delay, and return-from-bank flows.

### B-02 — Cash-on-delivery (COD) orders reserve stock but never commit inventory
**Area:** Order/inventory lifecycle  
**Evidence:** `server/src/services/order.service.js`, `server/src/services/payment.service.js`

All orders reserve stock at creation. Stock becomes a true deduction only in `handlePaymentSucceeded()`, which only occurs from a Stripe success webhook. COD intentionally has no PaymentIntent, so its reservation is never committed. The stale-reservation job will later release it, even while the COD order remains active and can be processed/shipped.

**Impact:** Stock can become saleable again while a COD order is being fulfilled, causing overselling. Units sold and inventory will be inaccurate.

**Fix:** Explicitly define a COD inventory policy. Usually reserve until a controlled admin state (for example, accepted/processing), then atomically commit stock; release it on cancellation/expiry. Never let the generic unpaid-card reservation expiry release live COD allocations. Add integration tests for COD → processing → shipped/cancelled and reservation expiry.

### B-03 — Database errors can silently fall back to fake in-memory commerce data
**Area:** Server data integrity/availability  
**Evidence:** `server/src/config/database.js`, `server/src/services/order.service.js`, most `models/*.model.js`, `auth.service.js`

The project has a broad memory-store fallback. Numerous database exceptions are swallowed (`catch {}`), then data is read/written in process memory. `createOrder()` catches a non-HTTP transaction error and then falls through to create a memory order. The API can therefore return apparent success while the database operation failed. The data disappears on process restart and differs per process/replica.

**Impact:** Lost orders, inconsistent stock, authentication/session anomalies, fake admin reports, and unpredictable behaviour under a DB outage or partial outage. Horizontal scaling makes this fundamentally unsafe.

**Fix:** Remove the fallback from all production execution paths. Use it only behind an explicit `DEMO_MODE=true` guard that production configuration rejects. For any DB failure, return a safe 503/500, alert, and preserve no false success. Do not swallow query/transaction errors. Add outage tests that prove checkout never creates an order outside MySQL.

### B-04 — Admin application cannot be installed reproducibly
**Area:** Build/release  
**Evidence:** `admin/package.json`, `admin/package-lock.json`

`npm ci --prefix admin` fails: the lockfile is not in sync (missing/invalid `@emnapi/*` transitive package entries). The repository README tells deployers to run this exact command.

**Impact:** A clean CI/CD or production build cannot reliably build the admin portal. This blocks a repeatable release.

**Fix:** Regenerate and commit the lockfile using the supported Node/npm version, then enforce `npm ci` for all three applications in CI.

## Critical

### C-01 — No checkout idempotency protection
**Area:** Order creation  
**Evidence:** `POST /api/orders`, `server/src/services/order.service.js`

There is no client-generated idempotency key persisted with the order. A double click, retry after a lost response, mobile reconnect, reverse proxy retry, or two browser tabs can create multiple valid orders and multiple reservations/charges.

**Fix:** Require an idempotency key for checkout, store it under a unique database constraint with a request fingerprint and response, and return the original result on retry. Use Stripe idempotency keys derived from that same key. Test concurrent identical requests and response-loss retry.

### C-02 — Webhook processing acknowledges Stripe before durable business processing
**Area:** Payments/webhooks  
**Evidence:** `server/src/controllers/webhook.controller.js`

The handler records the event, sends HTTP 200 to Stripe, then processes the event asynchronously. If post-response processing fails, the event is marked failed but Stripe will not retry because it received 200. The current response says the database row is there for manual review, but no durable worker/retry queue actually processes it.

**Impact:** Money can be captured while an order remains unpaid/unfulfilled or inventory is not committed, requiring manual intervention.

**Fix:** Process transactionally before returning 2xx, or persist to a durable queue/outbox and run a retrying worker with alerting and replay tooling. Only acknowledge after the event is safely queued. Add failure-injection tests.

### C-03 — Admin bearer token is stored in `localStorage`
**Area:** Admin authentication/security  
**Evidence:** `admin/src/lib/api.js`

The admin access JWT is persisted in browser localStorage. Any XSS in the admin origin, compromised dependency, or malicious browser extension can steal it and call privileged API routes until expiration.

**Fix:** Keep access tokens only in memory; use secure, HttpOnly, SameSite cookie-based refresh/session handling, strict CSP, and short admin sessions. Implement admin MFA, session/device audit, and re-authentication for destructive/refund actions.

### C-04 — Customer reviews are entirely fake/client-only and “verified buyer” is forgeable
**Area:** Reviews  
**Evidence:** `client/src/components/product/ReviewsSection.jsx`, `client/src/components/home/Reviews.jsx`; no review table, API route, moderation workflow, or review service exists.

Product review submission only appends a review to React state. It lets any visitor type an author name and labels the review `verified: true`; the review vanishes on refresh. Rating breakdowns and homepage reviews are hard-coded.

**Impact:** Misleading storefront content and no real review capability. A false “Verified Buyer” claim creates legal/reputation risk.

**Fix:** Implement database schema and API endpoints; allow reviews only for authenticated purchasers of delivered items; enforce one review per order line/product; add moderation, reporting, pagination, review media validation, helpful-vote abuse protection, and recalculated aggregate ratings. Remove fabricated claims/data before launch.

### C-05 — Core admin detail screens can display seed/mock data
**Area:** Admin data correctness  
**Evidence:** `admin/src/features/customers/customer-detail-page.jsx`, `admin/src/features/orders/order-detail-page.jsx`, `admin/src/features/products/product-detail-page.jsx`, `admin/src/features/dashboard/components/analytics-chart.jsx`

Several production admin screens import `src/data/seed` and use it as a fallback or supplement to live API results. This can show invented orders, customers, products, and analytics when the API is empty/fails.

**Impact:** Staff can make fulfilment/customer/product decisions from data that is not real.

**Fix:** Remove demo seeds from production bundles and replace fallbacks with explicit loading, empty, retry, and error states. Keep fixtures only in test/storybook development paths.

### C-06 — Known high-severity client dependency findings
**Area:** Supply chain  
**Evidence:** `npm audit --omit=dev` in `client`

The audit reports **two high severity advisories** affecting `react-router` and `react-router-dom` (reported as an RSC-mode CSRF-bypass issue). The project uses `^` version ranges, so exact resolved versions must be checked after upgrade.

**Fix:** Upgrade to a patched React Router release, regenerate lockfile, re-run audit, and test routes/auth redirects. Pin/lock production builds and add automated dependency scanning.

## High

### H-01 — Health endpoint reports HTTP 200 even when its database state is fallback/down
**Area:** Reliability/orchestration  
**Evidence:** `server/src/routes/index.js`

`GET /api/health` catches database errors, returns `database: 'fallback'`, sets `healthy = true`, and always returns 200. A load balancer will keep routing traffic to an instance that cannot perform durable commerce operations.

**Fix:** Separate liveness from readiness. Return non-2xx for readiness when MySQL/required dependencies are unavailable; expose safe dependency status only to internal monitoring. Alert on DB failure.

### H-02 — Production scale plan is incomplete: no deployed Redis/service topology, and in-process jobs duplicate
**Area:** Multi-user scalability  
**Evidence:** `server/src/middlewares/rate-limit.js`, `server/src/services/jobs.service.js`, `docker-compose.yml`

Rate limits use an in-memory store unless `REDIS_URL` exists. The included compose file provisions only MySQL, not Redis. Background cleanup/reconciliation runs in every API process; comments acknowledge it should be a dedicated worker at scale. The project does not contain deployment manifests, autoscaling, queue/outbox, cache/CDN, worker, metrics, tracing, or load-test CI.

**Impact:** Rate limiting becomes bypassable by spreading traffic across replicas; jobs race/duplicate; DB pools can exhaust; no practical evidence supports Amazon/Flipkart-scale concurrency.

**Fix:** Use Redis for distributed limits/cache, a real queue + one worker deployment, idempotent jobs, deployment resource limits, connection-pool math, metrics/traces/log aggregation, alerts, and capacity/load/soak testing with production-like MySQL.

### H-03 — CSV exports are vulnerable to spreadsheet formula injection
**Area:** Admin export security  
**Evidence:** `server/src/utils/helpers.js` (`csvCell`), admin customer/order/product exports

CSV escaping handles quotes/newlines but values beginning with `=`, `+`, `-`, or `@` are not prefixed/neutralized. Customer names, notes, product names, etc. can become spreadsheet formulas when staff open a CSV.

**Fix:** For cells that start with spreadsheet formula prefixes, prepend a single quote (or use an approved CSV-safe encoding policy). Test malicious values such as `=HYPERLINK(...)` and `@SUM(...)`.

### H-04 — File upload validates only an attacker-controlled MIME header
**Area:** Admin product image upload  
**Evidence:** `server/src/middlewares/upload.js`

Multer’s `file.mimetype` is used to allow an image, but it comes from the client multipart header. File bytes are not inspected, images are not decoded/re-encoded, malware scanning is absent, originals are publicly served from local disk, and there is no object storage/CDN lifecycle.

**Fix:** Verify magic bytes and decode images with a trusted image library; strip metadata/re-encode; reject malformed/polyglot files; malware scan where required; use private object storage plus CDN; set strict limits and deletion/orphan handling.

### H-05 — Customer checkout UI blocks guest checkout although API supports it
**Area:** Storefront conversion/functionality  
**Evidence:** `client/src/components/cart/ShoppingCart.jsx`

`handleCheckout()` redirects any unauthenticated user to login. The server explicitly supports guest quote/checkout with email. This is inconsistent functionality and causes avoidable conversion loss.

**Fix:** Implement a guest contact-email checkout path, post-order guest confirmation/order-access policy, account creation invitation, and cart merge semantics. Or deliberately remove/document guest checkout support server-side.

### H-06 — No real email delivery or customer communications workflow
**Area:** Account recovery/order operations  
**Evidence:** `server/src/services/auth.service.js`, no mail provider dependency/service; `requestPasswordReset()` only stores a token/logs it in non-production.

There is no email sender for password reset, verification, order receipt, payment receipt/failure, shipping/tracking, cancellation, refund, or transactional consent workflows. Password reset is non-functional for a real customer.

**Fix:** Integrate a transactional email provider with templates, signed URLs, retries/dead-letter handling, suppression/bounce handling, audit trail, and non-production mail sink. Do not log live reset tokens.

### H-07 — Shipping, tax, currency, fraud, and compliance logic are placeholder-level
**Area:** Commerce correctness  
**Evidence:** `server/src/services/order.service.js`, `server/src/config/env.js`

One global flat shipping fee, one global tax rate, and one global currency are used regardless of address, item, jurisdiction, promotions, or payment method. There is no address normalization/validation, tax engine, shipping carrier quote/rate selection, duties, fraud screening, coupon/gift card/store credit, invoice/legal tax records, or consent/privacy tooling.

**Impact:** Incorrect amounts and legal/compliance exposure for multi-region commerce.

**Fix:** Define launch geography and integrate appropriate address, tax, shipping, fraud and invoicing services before selling in those regions.

### H-08 — Hard-coded/demo credentials and sample data create deployment risk
**Area:** Operational security/data quality  
**Evidence:** root `README.md`, `server/.env.example`, `server/src/services/memory-store.js`

README publishes demo admin/customer credentials; default seed values are available if deployment configuration is careless. Development memory data contains fabricated customers/addresses and external Unsplash image URLs. There is no environment guard preventing seed/demo behaviour outside production beyond configuration discipline.

**Fix:** Never deploy demo credentials/data; require explicit non-default production secrets at startup; disable seeding in all non-local environments; scrub sample PII; use owned/authorized image assets.

## Medium

### M-01 — Error handling broadly suppresses failures and can mask integrity bugs
**Evidence:** many `catch {}` blocks in models/services; `query()` returns `[]` on errors.

An outage, SQL syntax error, constraint failure, or programming bug may be treated as “not found/empty” and eventually fall back to memory. This makes diagnosis and correct HTTP behaviour difficult.

**Fix:** Catch only expected failures, log structured context, map them to proper errors, and rethrow unexpected failures. Use transaction-level tests with forced errors.

### M-02 — Order reservation cleanup and reconciliation are not durable worker jobs
**Evidence:** `server/src/services/jobs.service.js`

Intervals live inside an API process. They stop during deploy/restart, run once per replica, and have no leader lock, job history, retry schedule, dashboard, dead-letter queue, or SLO. `alertFailedWebhooks()` queries columns (`event_type`, `error_message`, `status`) that do not match the current `stripe_events` schema (`type`, `error`, `processed_at`), so it cannot work as written.

**Fix:** Move jobs to a worker/queue or scheduled platform job; add leases/idempotency; fix schema/query mismatch; add execution and alert tests.

### M-03 — Products/orders/customer workflows are incomplete for a real store
Missing or incomplete capabilities include: returns/RMA workflow and customer return requests, exchanges, partial fulfilments/multiple shipments, partial cancellation, order edits, backorders/preorders, warehouse allocation, downloadable invoices, tax documents, support tickets, guest-order lookup, addresses book, wishlist/account syncing, coupons/promotions, gift cards, notification preferences, and audit logs for admin actions.

**Fix:** Prioritize based on launch requirements; do not present current admin status controls as a complete operations system.

### M-04 — Storefront cart/wishlist are device-local only and can be stale/tampered
**Evidence:** `client/src/store/cartSlice.js`, `client/src/store/wishlistSlice.js`

Cart and wishlist live in localStorage; they do not merge across login/devices, do not sync to user account, and can be edited by users. Server pricing protects checkout, but UI prices/availability can be stale. The cart renders client-stored images/text/prices before quote reconciliation.

**Fix:** Add server-side carts/wishlists and merge rules; refresh authoritative pricing/availability before display and checkout; show quote mismatch clearly.

### M-05 — Product detail/order UI functionality is incomplete
The UI has no visible card payment step, no order-detail route (the profile “View order” returns to `/orders`), no order cancellation UI despite an API endpoint, no payment retry/status UI, and no working full review system. The homepage Reviews “See all” button has no action. Several static company/blog/contact pages are placeholders.

### M-06 — Accessibility and UX validation are insufficient
No automated browser accessibility test suite is present. Code review identified clickable image/card patterns and modal/overlay-heavy UX that need keyboard, focus-trap, Escape, focus-return, screen-reader labels, reduced-motion and mobile-device validation. Images commonly lack a controlled fallback/asset pipeline. The storefront lint also has 18 warnings, including unused code and a Fast Refresh warning.

**Fix:** Add Playwright/Cypress plus axe-core; test keyboard-only and screen readers; establish semantic heading/landmark/modal standards; resolve all lint warnings before release.

### M-07 — The client contains parallel unused Next-style application/API files
**Evidence:** `client/src/app/**`, while the application is Vite/React (`src/main.jsx`, `src/App.jsx`).

The Vite build ignores/does not execute Next-style route files under `src/app`; they import undeclared/unused stack components and confuse the deployment architecture. This increases maintenance risk and creates an illusion of routes that do not run.

**Fix:** Remove the obsolete files or migrate deliberately to Next.js; maintain one frontend architecture.

### M-08 — Product category/navigation semantics are inconsistent/placeholder
Menus include collections such as sale/apparel/accessories, while the catalogue schema/data appears shoe-specific and category handling routes arbitrary labels. Filtering can yield empty/unexpected results. “Sale” is not a product-level sale/promotion model.

**Fix:** Drive navigation from active categories/facets returned by API; implement sale/promotions correctly; hide unsupported catalog areas.

## Low / hygiene

1. **Multer 1.x is deprecated** during server install. Upgrade to Multer 2.x after API/security regression testing.
2. **Client bundle is relatively large** (~394 kB JS / ~117 kB gzip from the build) and has no route/code splitting or performance budget. Optimize images, lazy load routes/components, and measure Core Web Vitals.
3. **No root CI pipeline** is present to run clean installs, lint, build, unit/integration/e2e/security checks, migrations, and deployment smoke tests.
4. **No test framework for UI components** is present; server test coverage is one executable e2e script rather than a maintained unit/integration test suite with reports.
5. **No database backup/restore, migration rollback, DR, retention, observability or incident runbooks** were found.
6. **`TRUST_PROXY` defaults to 1**; incorrect proxy topology can let clients influence IP-derived rate-limit/audit context. Configure it precisely per deployment.
7. **Public uploads are served directly from local filesystem.** This does not work reliably across multiple replicas and lacks backup/CDN/cache invalidation lifecycle.
8. **No CSP is configured explicitly.** Helmet defaults help, but define/test a strict production Content-Security-Policy, especially to protect the admin app.

---

# Positive controls already present

These are good foundations to retain:

- Input validation via Zod and unknown-field stripping.
- Public ULIDs rather than exposing sequential IDs.
- Role checks at the admin router boundary and ownership checks that return 404 for another customer’s order.
- Server-side product-price/tax/shipping calculation rather than trusting cart totals.
- MySQL row locking and a reservation model intended to prevent overselling.
- Password hashing and access/refresh token separation; HTTP-only refresh cookie.
- Basic rate limiting, Helmet, compression, CORS allow-list, upload count/size limits, request IDs, soft product delete, transaction retry for lock conflicts.
- The existing API e2e script covers many valuable routes and correctly tested one oversell race.

---

# Required release plan

## Phase 0 — Stop-the-line fixes
1. Fix B-01 through B-04.
2. Remove production memory fallback and prove database outage returns safe failure.
3. Finish Stripe client payment and server webhook reliability; resolve COD stock lifecycle.
4. Add order idempotency and inventory/payment state-machine tests.
5. Regenerate the admin lockfile and make all clean builds pass.
6. Upgrade the audited React Router dependency and re-audit.

## Phase 1 — Minimum viable safe launch
1. Implement real transactional email and customer order communications.
2. Remove mock admin data and fake/verified reviews; either build genuine reviews or remove the feature.
3. Add guest checkout or align API/UI policy.
4. Add Redis, a durable jobs worker/queue, production readiness endpoint, error tracking, metrics, backups, and alerts.
5. Add CSV formula protection and secure image processing/storage.
6. Add admin MFA, audited admin actions, least privilege, CSP, and secret management.

## Phase 2 — Prove it under realistic use
1. Staging environment: production-like MySQL, Redis, object storage/CDN, Stripe test mode, mail sandbox, HTTPS and reverse proxy.
2. Automated CI: `npm ci`, lint with zero warnings, builds, dependency audit, migration test, API integration tests with real MySQL, UI e2e/accessibility tests.
3. Load/soak tests: browse/search, login brute-force throttling, 10–100+ simultaneous last-item checkouts, duplicate checkout retries, webhook bursts, DB/Redis outages, rolling deploy during payment.
4. Security assessment: OWASP/API authorization, XSS, CSRF, upload bypass, CSV injection, token theft, rate-limit bypass, secrets scan and penetration test.
5. Operational drills: restore backup, replay failed webhooks, payment reconciliation, inventory reconciliation, order-support workflow, rollback migration.

## Suggested acceptance gates before live sales

- 100% clean reproducible builds for client/admin/server in CI.
- No high/critical dependency findings accepted without documented compensating control.
- All payment state transitions and retries tested using Stripe test clocks/webhooks.
- Real-MySQL concurrency test repeatedly proves exactly one success for last stock; COD lifecycle separately proves no released live allocation.
- Database/Redis/payment/email outage tests produce no false order success or lost inventory.
- Browser e2e flows pass for guest and registered checkout, card/3DS/COD/failure/cancel/retry/refund, mobile/desktop and keyboard accessibility.
- Monitoring/alerts/on-call and backup restore are verified.
