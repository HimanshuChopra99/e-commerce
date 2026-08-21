# Kicks Shoe Commerce

Storefront, admin dashboard, and Express/MySQL API in one repository.

## Local launch with complete demo data

1. Start MySQL and Redis: `docker compose up -d`
2. Configure the API: `cp server/.env.example server/.env`, then set `DB_PASSWORD=kick_local_password`.
3. Install packages: `npm ci --prefix server && npm ci --prefix client && npm ci --prefix admin`
4. Create and populate the database: `npm run db:reset --prefix server`
5. Start three development services in separate terminals:
   - `npm run dev --prefix server` (API, port 4000)
   - `npm run dev --prefix client` (storefront, port 5173)
   - `npm run dev --prefix admin` (admin, port 5174)

The seed creates 210 shoes, 25 customers, 120 orders, seven categories, and an administrator.
ChangeMe123!
**Admin:** `admin@kick.com` / ``  
**Customer:** `customer@example.com` / `Password123`

The seed passwords default to the values above (see `server/src/database/seed.js` and `server/src/services/memory-store.js`). Override them with `SEED_ADMIN_PASSWORD` / `SEED_CUSTOMER_PASSWORD` in `server/.env`. If you copy `.env.example`, note it ships placeholder values (`change_me_in_production`) — set them to `ChangeMe123!` / `Password123` for a working local demo. Change these credentials and all JWT secrets before deploying.

## Production build

```bash
npm ci --prefix client && npm run build --prefix client
npm ci --prefix admin && npm run build --prefix admin
npm ci --prefix server
NODE_ENV=production npm run db:migrate --prefix server
NODE_ENV=production npm start --prefix server
```

The API serves the storefront at `/` and admin panel at `/admin` once both frontend builds exist. Set secure, unique JWT secrets, production CORS origins, database credentials and Stripe keys in `server/.env` first.
