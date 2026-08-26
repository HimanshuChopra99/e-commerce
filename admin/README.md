# Kick Admin — Shoe Store Dashboard

An admin dashboard for a footwear e-commerce store. Manage products, orders,
customers and categories from one place.

Built with **plain JavaScript** (no TypeScript), React 19, **Shadcn UI**,
Tailwind v4, React Router and Vite.

---

## Getting started

```bash
npm install
npm run dev
```

Then open the URL it prints (usually http://localhost:5173).

| Command           | What it does                         |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the dev server with hot reload |
| `npm run build`   | Build for production into `dist/`    |
| `npm run preview` | Preview the production build         |
| `npm run lint`    | Check code for mistakes              |
| `npm run format`  | Auto-format all files with Prettier  |

---

## Where everything lives

```
src/
├── main.jsx          ← app entry point (starts React)
├── router.jsx        ← every URL and which page it shows  ⭐ start here
│
├── config/
│   └── brand.js      ← store name, currency, date helpers ⭐ edit me
│
├── data/             ← the demo data (swap for a real API later)
│   ├── seed.js            products, orders, customers
│   ├── categories-seed.js starter categories
│   └── stats.js           dashboard numbers, calculated from seed.js
│
├── stores/
│   └── catalog-store.js   live products + categories (saved in the browser)
│
├── features/         ← one folder per section of the app
│   ├── dashboard/
│   ├── products/
│   ├── orders/
│   ├── customers/
│   ├── categories/
│   └── errors/            the 404 and 500 screens
│
├── components/
│   ├── ui/           ← Shadcn building blocks (button, card, table…)
│   ├── layout/       ← sidebar, header, page shell
│   ├── data-table/   ← the reusable sortable/filterable table
│   └── …             ← small shared pieces (product image, stat cards…)
│
├── context/          ← theme, font, layout and search providers
├── hooks/            ← small reusable bits of logic
├── lib/              ← helper functions (cn, cookies, formatting)
└── styles/           ← Tailwind and theme CSS
```

### How a feature folder is organised

Every feature follows the same shape, so once you learn one you know them all:

```
features/products/
├── products-page.jsx          the list page      (/products)
├── product-new-page.jsx       the create form    (/products/new)
├── product-edit-page.jsx      the edit form      (/products/:id/edit)
├── product-detail-page.jsx    the detail view    (/products/:id)
├── products-data.js           dropdown options, labels, badge colours
└── components/                pieces used only by this feature
```

Files ending in `-page.jsx` are screens listed in `src/router.jsx`.

---

## The pages

| Page            | URL               | What you can do                                                       |
| --------------- | ----------------- | --------------------------------------------------------------------- |
| Dashboard       | `/`               | Revenue, orders, customers and AOV, plus analytics and inventory tabs |
| Products        | `/products`       | Search, filter and sort every shoe you sell                           |
| Add Product     | `/products/new`   | Full form: images, price, size/stock grid, colours, category, tags    |
| Product detail  | `/products/:id`   | Sales stats, stock per size, and orders containing that shoe          |
| Orders          | `/orders`         | Every order with payment and delivery status                          |
| Order detail    | `/orders/:id`     | Delivery timeline, items, totals, customer and address                |
| Customers       | `/customers`      | Registered shoppers with order counts and lifetime spend              |
| Customer detail | `/customers/:id`  | Full profile, complete order history, most-bought products            |
| Categories      | `/categories`     | Create categories and see them as large cards                         |
| Category detail | `/categories/:id` | The products inside a category; add or remove them                    |

---

## Common things you'll want to change

### Change the store name or currency

Everything brand-related is in **`src/config/brand.js`**:

```js
export const brand = {
  name: 'Kick', // ← shows in the sidebar and page titles
  tagline: 'Footwear Store',
  supportEmail: 'support@Kick.com',
}

export const currency = {
  code: 'USD', // ← use 'INR' for rupees
  symbol: '$', // ← '₹'
  locale: 'en-US', // ← 'en-IN'
}
```

Use `formatCurrency()` and `formatDate()` from that file wherever you show
money or dates, so the whole app stays consistent.

### Add a new page

1. Create `src/features/<thing>/<thing>-page.jsx` that exports a component.
2. Add a `{ path, element }` line in `src/router.jsx`.
3. Add a link in `src/components/layout/sidebar-data.js`.

### Categories

Categories are created by you in the UI, not hardcoded. They live in
`src/stores/catalog-store.js` and are saved to the browser's `localStorage`,
so they survive a refresh.

```js
addCategory({ name, description, color, image })
assignProductsToCategory(categoryId, [productId, ...])
removeProductFromCategory(productId)
deleteCategory(id)  // products become uncategorised, they aren't deleted
```

A product remembers its category in `product.categoryId`. On the Add Product
form the Category dropdown lists your categories; if you haven't made any yet
it shows a **Create category** button that takes you to the Categories page.

### Connect a real backend

Right now all data comes from `src/data/seed.js` (read-only demo data) and
`src/stores/catalog-store.js` (things you can change).

To go live, replace the store's actions and the seed exports with `fetch`
calls to your API. The pages don't care where the data comes from — they just
read arrays of objects, so their shape is your API contract.

The product form's save handler is in
`src/features/products/components/product-form.jsx`:

```js
const onSubmit = async (values) => {
  // 👉 Replace the store calls with: await fetch('/api/products', { ... })
}
```

---

## Notes

- **No TypeScript.** The whole project is `.js` / `.jsx`. `jsconfig.json` only
  exists so editors understand the `@/` import shortcut.
- **No TanStack Router.** Routing uses `react-router-dom`, configured in one
  readable file (`src/router.jsx`).
- `@tanstack/react-table` is still used for the sortable/filterable tables —
  it's wrapped in a single component (`src/components/data-table/data-table.jsx`)
  so the pages never touch its API directly.
- Product photos live in `public/products/`. `<ProductImage>` falls back to a
  shoe icon if an image is missing, so nothing ever renders broken.
- There's a smoke-test script that opens every page in a real browser and
  checks for errors: `node scripts/smoke.mjs http://localhost:5173`
  (needs `npx playwright install chromium` first).
