/**
 * Verifies the "no categories yet" branch of the product form dropdown:
 * it should show a Create category button that navigates to /categories.
 */
import { chromium } from 'playwright'

const BASE = process.argv[2] ?? 'http://127.0.0.1:5199'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(e.message))

// Wipe persisted catalogue, then force zero categories.
await page.goto(`${BASE}/categories`, { waitUntil: 'networkidle' })
await page.evaluate(() => {
  localStorage.setItem(
    'Kick-catalog',
    JSON.stringify({ state: { categories: [], products: [] }, version: 0 })
  )
})

await page.goto(`${BASE}/categories`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
const emptyPage = await page.getByText('No categories yet').first().isVisible()
console.log(`${emptyPage ? 'PASS' : 'FAIL'}  categories page empty state`)
await page.screenshot({ path: 'screenshots/categories-empty.png' })

await page.goto(`${BASE}/products/new`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await page.locator('button:has-text("No categories yet")').first().click()
await page.waitForTimeout(600)

const cta = page.getByRole('button', { name: /create category/i })
const ctaVisible = await cta.isVisible()
console.log(`${ctaVisible ? 'PASS' : 'FAIL'}  dropdown shows Create category CTA`)
await page.screenshot({ path: 'screenshots/dropdown-empty-state.png' })

await cta.click()
await page.waitForTimeout(1200)
const redirected = page.url().endsWith('/categories')
console.log(
  `${redirected ? 'PASS' : 'FAIL'}  CTA redirects to /categories  (${page.url().replace(BASE, '')})`
)

// Restore demo data for subsequent runs.
await page.evaluate(() => localStorage.removeItem('Kick-catalog'))

const clean = errors.filter((e) => !e.includes('favicon')).length === 0
console.log(`${clean ? 'PASS' : 'FAIL'}  no console errors`)

await browser.close()
const ok = emptyPage && ctaVisible && redirected && clean
console.log(ok ? '\n✓ EMPTY-STATE FLOW PASSED' : '\n✗ EMPTY-STATE FLOW FAILED')
process.exit(ok ? 0 : 1)
