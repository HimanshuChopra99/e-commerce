import * as voiceSearch from '../src/services/voice-search.service.js'
import { dispatch } from '../src/handlers/retell-functions.js'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    passed++
    console.log(`  ✓ PASS: ${message}`)
  } else {
    failed++
    console.error(`  ✗ FAIL: ${message}`)
  }
}

async function runTests() {
  console.log('\n=== Testing Voice Search & Suggestion Engine ===\n')

  await voiceSearch.buildIndex()

  // 1. Suggestion requests MUST return multiple / show list on screen
  console.log('--- Test Suite 1: Suggestions / Recommendations (Must show list on screen) ---')
  const s1 = await voiceSearch.search('suggest some shoes for running')
  assert(s1.type === 'multiple', 'suggest some shoes for running -> type: multiple')
  assert(s1.navigateTo.includes('category=running'), 'suggest running -> category=running in URL')

  const s2 = await voiceSearch.search('recommend casual shoes for women')
  assert(s2.type === 'multiple', 'recommend casual shoes for women -> type: multiple')
  assert(s2.navigateTo.includes('gender=women'), 'recommend women -> gender=women in URL')

  const s3 = await voiceSearch.search('show me cheap sneakers')
  assert(s3.type === 'multiple', 'show me cheap sneakers -> type: multiple')
  assert(s3.navigateTo.includes('sort=price_asc'), 'cheap sneakers -> sort=price_asc in URL')

  const s4 = await voiceSearch.search('what do you suggest for basketball')
  assert(s4.type === 'multiple', 'what do you suggest for basketball -> type: multiple')
  assert(s4.navigateTo.includes('category=basketball'), 'suggest basketball -> category=basketball')

  const s5 = await voiceSearch.search('show me unisexual shoes')
  assert(s5.type === 'multiple', 'show me unisexual shoes -> type: multiple')
  assert(s5.navigateTo.includes('gender=unisex'), 'unisexual -> gender=unisex in URL')

  // 2. Misspelling & Typo Tolerance
  console.log('\n--- Test Suite 2: Misspellings and Typo Tolerance ---')
  const m1 = await voiceSearch.search('nikey runing shoes')
  assert(m1.type === 'multiple', 'nikey runing shoes -> type: multiple')
  assert(m1.navigateTo.includes('category=running'), 'nikey runing -> category=running')

  const m2 = await voiceSearch.search('addidas snickers for womans')
  assert(m2.type === 'multiple', 'addidas snickers for womans -> type: multiple')
  assert(m2.navigateTo.includes('category=sneakers') && m2.navigateTo.includes('gender=women'), 'addidas snickers womans -> sneakers + women')

  const m3 = await voiceSearch.search('jorden basktball in blak')
  assert(m3.type === 'multiple', 'jorden basktball in blak -> type: multiple')
  assert(m3.navigateTo.includes('category=basketball') && m3.navigateTo.includes('color=Black'), 'jorden basktball blak -> basketball + Black')

  const m4 = await voiceSearch.search('formel lether shoes for mn')
  assert(m4.type === 'multiple', 'formel lether shoes for mn -> type: multiple')
  assert(m4.navigateTo.includes('category=formal') && m4.navigateTo.includes('gender=men'), 'formel lether mn -> formal + men')

  // 3. Specific Product Name Match (>= 80% name match -> DIRECT product detail page)
  console.log('\n--- Test Suite 3: Specific Product Name Match (>= 80% name match -> Direct page) ---')
  const sampleProduct = (await voiceSearch.search('running')).products[0]
  if (sampleProduct) {
    const p1 = await voiceSearch.search(sampleProduct.name)
    assert(p1.type === 'exact', `Exact product name "${sampleProduct.name}" -> type: exact`)
    assert(p1.product?.slug === sampleProduct.slug, `Returns correct slug: ${sampleProduct.slug}`)

    // Slight typo in name (e.g. 1 char difference)
    const typoName = sampleProduct.name.slice(0, -1) + 'x'
    const p2 = await voiceSearch.search(typoName)
    assert(p2.type === 'exact', `Typo in product name "${typoName}" -> type: exact`)
  }

  // 4. Structured arguments from Retell AI
  console.log('\n--- Test Suite 4: Retell Function Dispatcher ---')
  const d1 = await dispatch('search_product', {
    query: 'running shoes',
    brand: 'Nike',
    category: 'running',
    gender: 'men',
    color: 'Black',
    max_price: 150,
  }, 'user_123')
  assert(d1.success === true, 'dispatch search_product with structured filters -> success')
  assert(d1.total !== undefined || d1.product !== undefined, 'returns structured response')

  const d2 = await dispatch('suggest_product', {
    category: 'sneakers',
    gender: 'women',
  }, 'user_123')
  assert(d2.success === true, 'dispatch suggest_product -> success')
  assert(d2.navigateTo?.includes('category=sneakers'), 'suggest_product navigates to sneakers list')

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`)
  if (failed > 0) process.exit(1)
}

runTests().catch(err => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
