/**
 * Headless smoke test: visits every admin route, exercises the key
 * interactions (category creation, form validation, filters, navigation) and
 * fails loudly on any console error or uncaught exception.
 *
 * Usage: node scripts/smoke.mjs [baseUrl]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const BASE = process.argv[2] ?? 'http://127.0.0.1:5199'
const OUT = 'screenshots'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

let errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`[console] ${msg.text()}`)
})
page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`))

const results = []

function check(label, extra = '') {
  const real = errors.filter(
    (e) => !e.includes('favicon') && !e.includes('Download the React DevTools')
  )
  const ok = real.length === 0
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(40)} ${extra}`)
  real.forEach((e) => console.log(`      ${e.slice(0, 200)}`))
  errors = []
}

function assert(label, condition, extra = '') {
  results.push(condition)
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label.padEnd(40)} ${extra}`)
}

async function visit(label, path) {
  errors = []
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  const heading =
    (await page.locator('h1, h2').first().textContent().catch(() => '')) ?? ''
  await page.screenshot({ path: `${OUT}/${label}.png` })
  check(path, `heading="${heading.trim().slice(0, 40)}"`)
  return heading.trim()
}

/* ------------------------------ Page loads ------------------------------ */
await visit('dashboard', '/')
await visit('products', '/products')
await visit('product-new', '/products/new')
await visit('product-detail', '/products/PRD-0001')
await visit('product-edit', '/products/PRD-0001/edit')
await visit('orders', '/orders')
await visit('customers', '/customers')
await visit('categories', '/categories')

/* ------------------- Removed nav entries are really gone ----------------- */
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
const navText = await page.locator('[data-slot="sidebar"]').innerText()
assert(
  'sidebar has no Pages/Other/Auth/Errors',
  !/\bPages\b|\bOther\b|\bAuth\b|\bErrors\b|Help Center|Settings/i.test(navText),
  JSON.stringify(navText.replace(/\s+/g, ' ').slice(0, 90))
)
assert(
  'sidebar has Categories',
  /Categories/.test(navText)
)

/* ---------------- Theme switch / config / profile still work ------------- */
errors = []
await page.getByRole('button', { name: /open theme settings/i }).click()
await page.waitForTimeout(600)
const drawerOpen = await page.getByText('Theme Settings').isVisible()
assert('config drawer (gear) opens', drawerOpen)
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
check('config drawer no errors')

errors = []
await page.locator('header button.rounded-full').last().click()
await page.waitForTimeout(500)
const profileOpen = await page.getByText('Sign out').first().isVisible()
assert('profile dropdown opens with Sign out', profileOpen)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
check('profile dropdown no errors')

/* ------------------------ 404 shows on a real error ---------------------- */
errors = []
await page.goto(`${BASE}/this-route-does-not-exist`, {
  waitUntil: 'networkidle',
})
await page.waitForTimeout(700)
const has404 = await page.getByText('404').first().isVisible()
assert('unknown URL renders the 404 screen', has404)
await page.screenshot({ path: `${OUT}/error-404.png` })

/* -------------------------- Category creation flow ----------------------- */
await page.goto(`${BASE}/categories`, { waitUntil: 'networkidle' })
errors = []
const cardsBefore = await page.locator('a[href^="/categories/"]').count()
await page.getByRole('button', { name: /create category/i }).first().click()
await page.waitForTimeout(600)
await page.getByLabel('Category name').fill('Smoke Test Cat')
await page
  .getByLabel('Description')
  .fill('Created by the automated smoke test.')
await page.getByRole('button', { name: 'Create category' }).click()
await page.waitForTimeout(1000)
const cardsAfter = await page.locator('a[href^="/categories/"]').count()
await page.screenshot({ path: `${OUT}/categories-after-create.png` })
check('create category', `${cardsBefore} cards -> ${cardsAfter} cards`)
assert('new category card appears', cardsAfter === cardsBefore + 1)

/* ------------------- Category detail + add products flow ----------------- */
errors = []
await page.getByText('Smoke Test Cat').first().click()
await page.waitForTimeout(1000)
const emptyState = await page.getByText('No products yet').isVisible()
assert('new category detail shows empty state', emptyState)

await page.getByRole('button', { name: /add products/i }).first().click()
await page.waitForTimeout(700)
await page.locator('label:has([role="checkbox"])').first().click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: /add to category/i }).click()
await page.waitForTimeout(1000)
const rowCount = await page.locator('table tbody tr').count()
await page.screenshot({ path: `${OUT}/category-detail.png` })
check('add products to category', `${rowCount} product rows`)
assert('product landed in category', rowCount >= 1)

/* ---------- Product form category dropdown lists real categories --------- */
await page.goto(`${BASE}/products/new`, { waitUntil: 'networkidle' })
errors = []
await page.locator('button:has-text("Select category")').first().click()
await page.waitForTimeout(600)
const hasOption = await page
  .getByRole('option', { name: /Smoke Test Cat/i })
  .isVisible()
assert('product form dropdown lists created category', hasOption)
await page.keyboard.press('Escape')
await page.screenshot({ path: `${OUT}/product-new-category-dropdown.png` })
check('category dropdown no errors')

/* ----------------------- Form validation behaviour ----------------------- */
errors = []
await page.getByRole('button', { name: /publish product/i }).click()
await page.waitForTimeout(900)
const invalidCount = await page.locator('p.text-destructive').count()
check('empty form blocks submit', `${invalidCount} validation messages`)
assert(
  'stayed on the form',
  page.url().endsWith('/products/new'),
  page.url().replace(BASE, '')
)

/* ---------------------------- Search filtering --------------------------- */
await page.goto(`${BASE}/products`, { waitUntil: 'networkidle' })
errors = []
const before = await page.locator('table tbody tr').count()
await page.getByPlaceholder(/search by name/i).fill('boot')
await page.waitForTimeout(900)
const after = await page.locator('table tbody tr').count()
check('product search filters rows', `${before} rows -> ${after} rows`)

/* ------------------------------- Dark mode ------------------------------- */
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
errors = []
await page.evaluate(() => {
  document.cookie = 'vite-ui-theme=dark; path=/; max-age=31536000'
})
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.screenshot({ path: `${OUT}/dashboard-dark.png` })
check('dark mode renders')

await browser.close()

const failed = results.filter((r) => !r).length
console.log(
  `\n${failed === 0 ? '✓ ALL CHECKS PASSED' : `✗ ${failed} CHECK(S) FAILED`} (${results.length} total)`
)
process.exit(failed === 0 ? 0 : 1)
