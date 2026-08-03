# Kicks Shoe Commerce

Storefront, admin dashboard, and Express/MySQL API in one repository.

## Local launch with complete demo data

1. Start MySQL: `docker compose up -d`
2. Configure the API: `cp server/.env.example server/.env`, then set `DB_PASSWORD=kick_local_password`.
3. Install packages: `npm ci --prefix server && npm ci --prefix client && npm ci --prefix admin`
4. Create and populate the database: `npm run db:reset --prefix server`
5. Start three development services in separate terminals:
   - `npm run dev --prefix server` (API, port 4000)
   - `npm run dev --prefix client` (storefront, port 5173)
   - `npm run dev --prefix admin` (admin, port 5174)

The seed creates 210 shoes, 25 customers, 120 orders, seven categories, and an administrator.

**Admin:** `admin@kick.com` / `AdminPassword123!`  
**Customer:** `customer1@example.com` / `Password123`

Change these credentials and all JWT secrets before deploying.

## Production build

```bash
npm ci --prefix client && npm run build --prefix client
npm ci --prefix admin && npm run build --prefix admin
npm ci --prefix server
NODE_ENV=production npm start --prefix server
```

The API serves the storefront at `/` and admin panel at `/admin` once both frontend builds exist. Set secure, unique JWT secrets, production CORS origins, database credentials and Stripe keys in `server/.env` first.
