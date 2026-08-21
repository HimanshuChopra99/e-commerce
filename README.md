<div align="center">

# 👟 KICKS — Full-Stack Shoe Store

**A production-grade e-commerce platform with AI voice shopping, real-time order tracking, and a complete delivery partner ecosystem.**

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![MySQL](https://img.shields.io/badge/MySQL-8.4-4479A1?logo=mysql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7.4-DC382D?logo=redis&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?logo=socket.io)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe)

</div>

---

## 📖 What Is KICKS?

KICKS is a fully featured shoe e-commerce application built from scratch with a MERN-adjacent stack (MySQL instead of MongoDB). It ships as a **monorepo with four apps**:

| App | Port | Description |
|-----|------|-------------|
| `server` | 4000 | Express REST API + Socket.io |
| `client` | 5173 | Customer storefront (React 19) |
| `admin` | 5174 | Admin dashboard (React 19 + shadcn/ui) |
| `delivery-app` | 5175 | Delivery partner mobile-style app (React 18) |

Beyond basic shopping, KICKS has a **Retell AI voice agent** ("Kick") embedded in the storefront so customers can shop, search, and manage their cart entirely by voice — and a **Zomato/Porter-style delivery dispatch system** with real-time GPS tracking via Socket.io and Redis.

---

## ✨ Features

### 🛍️ Customer Storefront
- Browse 210+ shoes across 7 categories with filter sidebar (brand, size, gender, price range)
- Product pages with multi-image gallery, colour variants, size chart, and related products
- Shopping cart (persisted via Redux + API sync), favourites, and wishlist
- **Map-based address picker** using `react-leaflet` + Nominatim (no paid geocoding needed)
- Checkout with **Stripe payment integration** (card payments, webhooks)
- Order history, live order status, and a dedicated **Track Order** page with live map

### 🎙️ AI Voice Shopping Agent ("Kick")
- One-click microphone button launches a **Retell AI** voice call
- Voice commands: search by name/category/size, add to cart, view cart, go to checkout
- **Fuse.js** fuzzy search engine matches spoken product names to the catalogue
- Real-time browser control via Socket.io `ui:command` events — the page responds as you talk
- Session-state service streams live cart and page context to the agent as dynamic variables

### 📦 Order Management
- Full order lifecycle: `pending → processing → ready_for_pickup → assigned → out_for_delivery → delivered`
- Auto-generated tracking numbers
- Admin can manually advance order status or cancel

### 🚚 Delivery Partner System
- Separate JWT auth layer for delivery partners
- Atomic **first-accept-wins** dispatch — partners in the pool race to claim `ready_for_pickup` orders; a MySQL compare-and-swap ensures exactly one partner wins
- Partner toggles online/offline; orders only broadcast to online partners via Socket.io
- **Live GPS tracking**: partner app pings location every few seconds → Redis stores session + last 100 positions → customer's Track Order map updates in real time
- Admin live map shows all active deliveries simultaneously

### 🖥️ Admin Dashboard
- KPI stat cards: revenue, orders, customers, low-stock items
- Full **product CRUD** with image upload (Multer), variant management, stock control
- Order management table with status advancement and delivery partner assignment
- Customer list with order history, blocking, and notes
- Delivery partner management: approve, deactivate, view earnings
- Live delivery map (Leaflet) for all in-flight orders
- shadcn/ui components, TanStack Table, Recharts, dark/light theme

### 🔐 Auth & Security
- JWT access tokens (15 min) + refresh tokens (30 days) stored as secure HTTP-only cookies
- bcrypt password hashing (cost 12)
- Zod validation on every API endpoint
- Rate limiting with Redis (falls back gracefully if Redis is down)
- Helmet.js security headers

---

## 🏗️ Tech Stack

**Backend**
- Node.js 20+ / Express 4 (ESM)
- MySQL 8.4 (via `mysql2` connection pool)
- Redis 7.4 (caching, rate-limiting, GPS tracking sessions)
- Socket.io 4.8 (real-time events: order status, GPS pings, voice commands)
- Stripe SDK (payments + webhooks)
- Retell SDK (voice agent)
- Fuse.js (fuzzy product search for voice)
- ULID + BIGINT dual-ID architecture
- Zod (env + request validation)

**Frontend (client + admin + delivery-app)**
- React 19 / 18
- Redux Toolkit + React Redux (cart, auth, UI state)
- React Router DOM v7 / v6
- Tailwind CSS v3/v4
- react-leaflet + Leaflet (maps, routing)
- Stripe React SDK
- Retell Client JS SDK
- shadcn/ui + Radix UI (admin only)
- Recharts (admin analytics)
- Framer Motion (delivery app)
- Lucide React (icons)

**Infrastructure**
- Docker Compose (MySQL 8.4 + Redis 7.4)
- Multer (image uploads)
- node --watch (dev hot-reload, no nodemon needed)

---

## 📁 Project Structure

```
kicks/
├── docker-compose.yml          # MySQL + Redis containers
├── server/                     # Express API
│   ├── index.js
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── config/             # DB, Redis, Socket.io, Stripe, Retell, env
│       ├── controllers/        # Route handlers (admin + public)
│       ├── database/           # schema.sql, migrate.js, seed.js, migrations/
│       ├── handlers/           # retell-functions.js (voice agent tool calls)
│       ├── middlewares/        # auth, delivery-partner-auth, rate-limit, upload, validate
│       ├── models/             # SQL query wrappers per entity
│       ├── routes/             # REST routes (admin + public)
│       ├── services/           # Business logic, cache, tracking, voice-search, jobs
│       ├── utils/              # ApiError, ApiResponse, asyncHandler, money, geocode
│       └── validators/         # Zod schemas
├── client/                     # Customer storefront (React 19)
│   ├── src/
│   │   ├── components/         # auth, cart, common, home, product
│   │   ├── pages/              # Home, Product, Cart, Checkout, Orders, TrackOrder, Profile…
│   │   ├── lib/                # api.js, retell.js, socket.js, toast.js
│   │   └── hooks/              # useVoiceCommands, usePageTracker
│   └── vite.config.js
├── admin/                      # Admin dashboard (React 19 + shadcn)
│   └── src/
│       ├── components/         # layout, data-table, ui (shadcn), live-map
│       └── pages/              # Dashboard, Products, Orders, Customers, Delivery Partners
└── delivery-app/               # Delivery partner PWA (React 18)
    └── src/
        ├── pages/              # Home, Orders, Tracking, Profile, Earnings…
        └── hooks/              # useDeliverySocket, useGpsTracking, usePartnerData
```

---

## ⚙️ Prerequisites

Make sure you have all of these installed before you start:

| Tool | Minimum Version | Install |
|------|----------------|---------|
| Node.js | 20+ | https://nodejs.org |
| npm | 10+ | bundled with Node |
| Docker Desktop | latest | https://docker.com |
| Git | any | https://git-scm.com |

Optional but recommended:
- **Stripe CLI** — to forward webhooks to localhost during development
- **Retell AI account** — only needed if you want voice features

---

## 🚀 Quick Start (Local Development)

### 1. Clone the repo

```bash
git clone https://github.com/HimanshuChopra99/e-commerce.git
cd e-commerce
```

### 2. Start MySQL & Redis via Docker

```bash
docker compose up -d
```

Wait ~10 seconds for the containers to become healthy. You can check with:

```bash
docker compose ps
```

### 3. Configure the server

```bash
cp server/.env.example server/.env
```

The `.env.example` already has `DB_PASSWORD=kick_local_password` matching the Docker container. For local dev, the file is ready to use as-is. See [Environment Variables](#-environment-variables) below for a full reference.

### 4. Install all dependencies

```bash
npm ci --prefix server
npm ci --prefix client
npm ci --prefix admin
npm ci --prefix delivery-app
```

### 5. Set up the database

```bash
# Creates all tables and inserts seed data in one command
npm run db:reset --prefix server
```

This creates **210 shoes, 25 customers, 120 orders, 7 categories, and an admin account**.

### 6. Start the dev servers (4 terminals)

```bash
# Terminal 1 — API server (port 4000)
npm run dev --prefix server

# Terminal 2 — Customer storefront (port 5173)
npm run dev --prefix client

# Terminal 3 — Admin dashboard (port 5174)
npm run dev --prefix admin

# Terminal 4 — Delivery partner app (port 5175)
npm run dev --prefix delivery-app
```

### 7. Open in browser

| URL | What it is |
|-----|-----------|
| http://localhost:5173 | Customer storefront |
| http://localhost:5174 | Admin dashboard |
| http://localhost:5175 | Delivery partner app |
| http://localhost:4000/api | REST API |

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@kick.com` | `ChangeMe123!` |
| Customer | `customer@example.com` | `Password123` |
| Delivery Partner | *(register via admin panel)* | — |

> **Note:** If you change `server/.env` and redeploy the seed, the passwords are controlled by `SEED_ADMIN_PASSWORD` and `SEED_CUSTOMER_PASSWORD` env vars.

---

## 🌍 Environment Variables

All server config is in `server/.env`. The table below covers every variable:

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `127.0.0.1` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | *(empty)* | **Set to `kick_local_password` for Docker** |
| `DB_NAME` | `Kick` | Database name |

### Redis (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | *(empty)* | e.g. `redis://localhost:6379`. If blank, an in-process fallback is used (single-instance dev only) |
| `REDIS_CACHE_TTL_SECONDS` | `300` | Default TTL for cached entries |

### Auth & Security

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_ACCESS_SECRET` | *(dev default)* | **Change in production.** Min 32 chars |
| `JWT_REFRESH_SECRET` | *(dev default)* | **Change in production.** Min 32 chars |
| `JWT_ACCESS_TTL` | `15m` | Access token lifetime |
| `JWT_REFRESH_TTL_DAYS` | `30` | Refresh token lifetime in days |
| `BCRYPT_ROUNDS` | `12` | bcrypt cost factor |

### Stripe (optional for dev)

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | From Stripe dashboard → Developers → API keys |
| `STRIPE_PUBLISHABLE_KEY` | Publishable key for the client |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen --forward-to ...` or Stripe dashboard |
| `CURRENCY` | ISO currency code, default `USD` |

> Stripe keys are optional — the storefront works without them; checkout will be disabled.

### Retell AI (optional)

| Variable | Description |
|----------|-------------|
| `RETELL_API_KEY` | From https://app.retellai.com → API keys |
| `RETELL_AGENT_ID` | The agent ID to initiate calls with |

> Voice features are disabled if `RETELL_API_KEY` is not set.

### Business Rules

| Variable | Default | Description |
|----------|---------|-------------|
| `TAX_RATE` | `0.08` | Sales tax rate (8%) |
| `FREE_SHIPPING_THRESHOLD` | `150` | Order value for free shipping |
| `FLAT_SHIPPING_RATE` | `9.99` | Shipping cost below threshold |
| `LOW_STOCK_THRESHOLD` | `12` | Units below which stock is flagged low |
| `MAX_QTY_PER_LINE` | `10` | Max quantity per cart line |

---

## 📡 API Overview

Base URL: `http://localhost:4000/api`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register a new customer |
| POST | `/auth/login` | Login, returns JWT cookies |
| POST | `/auth/logout` | Clear auth cookies |
| POST | `/auth/refresh` | Rotate access token |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | List products (filter by category, size, gender, brand, price) |
| GET | `/products/:id` | Single product with variants |
| GET | `/categories` | All active categories |

### Cart & Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customer/state` | Current cart + favourites for logged-in user |
| POST | `/orders` | Place an order |
| GET | `/orders` | Customer's order history |
| GET | `/orders/:id` | Single order detail |
| GET | `/tracking/:trackingNumber` | Live tracking data |

### Admin (requires admin JWT)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | KPI metrics |
| CRUD | `/admin/products` | Product management |
| CRUD | `/admin/orders` | Order management + status advancement |
| GET | `/admin/customers` | Customer list |
| CRUD | `/admin/delivery-partners` | Delivery partner management |

### Delivery Partners
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/delivery/auth/login` | Partner login (separate JWT) |
| POST | `/delivery/orders/:id/accept` | Accept an order (atomic) |
| POST | `/delivery/orders/:id/status` | Update delivery status |
| POST | `/delivery/location` | Ping GPS location |

### Voice (Retell webhook)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/retell/create-web-call` | Initiate a Retell call session |
| POST | `/retell/webhook` | Handle Retell function calls (search, add-to-cart, etc.) |

---

## 🔌 Real-Time Events (Socket.io)

The server exposes several Socket.io rooms and events:

| Room | Events | Used by |
|------|--------|---------|
| `admin_room` | `order:status_changed`, `order:new` | Admin dashboard |
| `delivery:pool` | `order:new_available`, `order:assigned_away` | Delivery partner app |
| `delivery:{partnerId}` | `order:assigned`, `location:ack` | Individual partner |
| `tracking:{trackingNumber}` | `tracking:update` | Customer track page |
| `user:{userId}` | `ui:command` (voice commands) | Storefront (voice agent) |

---

## 🗃️ Database

The schema lives in `server/src/database/schema.sql`. Key tables:

```
users           — customers and admins (ULID public_id + BIGINT internal id)
auth_tokens     — refresh, password_reset, email_verify tokens
categories      — shoe categories with slug, image, sort order
products        — full product record including JSON images, tags, colour images
variants        — size/colour stock per product
orders          — full order with address snapshot, totals, tracking number
order_items     — line items with price snapshot
delivery_partners — separate credentials + online status + earnings
```

### Database Commands

```bash
# Apply only new migration files (safe to run repeatedly)
npm run db:migrate --prefix server

# Seed demo data (idempotent — safe to run again)
npm run db:seed --prefix server

# Drop all tables and reseed from scratch
npm run db:reset --prefix server
```

---

## 💳 Stripe Setup (Optional)

To enable real payments:

1. Create a free account at https://stripe.com
2. Copy your **test mode** keys into `server/.env`
3. Forward webhooks in a separate terminal:
   ```bash
   stripe listen --forward-to localhost:4000/api/webhooks/stripe
   ```
4. Copy the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET`

Use Stripe's test card `4242 4242 4242 4242` with any future expiry and any CVC.

---

## 🎙️ Retell AI Voice Setup (Optional)

To enable the "Kick" AI voice shopping agent:

1. Sign up at https://app.retellai.com
2. Create a new agent and configure it with the system prompt from `Kick Voice AI Shopping Agent.json` (included in the repo root)
3. Copy your `RETELL_API_KEY` and `RETELL_AGENT_ID` into `server/.env`
4. The microphone button will appear in the storefront once the keys are set

---

## 🧪 Running Tests

```bash
# End-to-end API test suite (requires running server)
npm run test --prefix server
```

Make sure the API server is running on port 4000 before executing the tests.

---

## 🏭 Production Build

```bash
# Build all frontends
npm ci --prefix client  && npm run build --prefix client
npm ci --prefix admin   && npm run build --prefix admin
npm ci --prefix delivery-app && npm run build --prefix delivery-app

# Install server deps
npm ci --prefix server

# Run DB migrations (non-destructive)
NODE_ENV=production npm run db:migrate --prefix server

# Start API (serves built frontends at / and /admin)
NODE_ENV=production npm start --prefix server
```

**Before going to production:**
- Set strong, unique `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (min 32 chars each)
- Set real `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET`
- Set `REDIS_URL` to a persistent Redis instance
- Set `CORS_ORIGINS` to your actual domain(s)
- Change the default admin password after first login

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 🙌 Credits
 
This project was built on the shoulders of excellent open-source work and design resources. Full credit to the original creators.
 
### 🎨 Design
 
| Part | Designer / Source | Link |
|------|------------------|------|
| **Customer storefront UI** | Figma Community — *KICKS Shoes Ecommerce Website & Admin MVP* | [View on Figma Community](https://www.figma.com/community/file/1214498651988846999/kicks-shoes-ecommerce-website-and-admin-mvp) |
| **Admin dashboard UI** | satnaing — *shadcn-admin* | [github.com/satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) |
| **Delivery partner app UI Design** | designed & developed from scratch | [Himanshu Chopra](https://github.com/HimanshuChopra99) |
 
### 💻 Development
 
| Part | Developer |
|------|-----------|
| **Customer storefront** (`/client`) — full implementation | [Himanshu Chopra](https://github.com/HimanshuChopra99) |
| **Backend API** (`/server`) — full implementation | [Himanshu Chopra](https://github.com/HimanshuChopra99) |
| **Admin dashboard** (`/admin`) — Customized by | [Himanshu Chopra](https://github.com/HimanshuChopra99) |
| **Delivery partner app** (`/delivery-app`) — full implementation | [Himanshu Chopra](https://github.com/HimanshuChopra99) |
 
---

## 📄 License

MIT — see individual `LICENSE` files inside `admin/`

---

<div align="center">
Built with ❤️ by <a href="https://github.com/HimanshuChopra99">Himanshu Chopra</a>
</div>
