/**
 * Seeds a comprehensive catalogue with 200+ unique products, 25+ users, and 120+ orders.
 *
 * Safe to run multiple times.
 */
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'node:url'
import { pool, closePool } from '../config/database.js'
import { env } from '../config/env.js'
import { logger } from '../config/logger.js'
import { publicId, slugify, colorCode } from '../utils/helpers.js'

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL ?? 'admin@kick.com').toLowerCase()
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!'

const CATEGORIES = [
  { name: 'Running', color: 'blue', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80', description: 'Road and trail shoes built for distance, speed and daily training.' },
  { name: 'Sneakers', color: 'teal', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80', description: 'Everyday low-tops, high-tops and lifestyle silhouettes.' },
  { name: 'Casual shoes', color: 'indigo', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80', description: 'Comfortable casual shoes for daily street wear.' },
  { name: 'Formal', color: 'slate', image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&auto=format&fit=crop&q=80', description: 'Oxfords, derbies and loafers for the office and occasions.' },
  { name: 'Boots', color: 'amber', image: '/products/boot-01.png', description: 'Hiking, chelsea and weatherproof boots for rough ground.' },
  { name: 'Basketball', color: 'orange', image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600&auto=format&fit=crop&q=80', description: 'High-traction court shoes built for speed and vertical stability.' },
  { name: 'Outdoor', color: 'teal', image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80', description: 'Rugged terrain footwear designed for trail running and all-weather adventures.' },
]

// High-quality white-background / studio shoe photo URLs
const STUDIO_SHOES = [
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1575537302964-96cd47c06b1b?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1586525198428-225f6f12cff5?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&auto=format&fit=crop&q=80',
]

function imageForProduct(index, category, secondary) {
  const sourceIndex = (index * 7 + (secondary ? 11 : 0)) % STUDIO_SHOES.length
  const base = STUDIO_SHOES[sourceIndex]
  const crop = ['center', 'top', 'bottom', 'left', 'right'][index % 5]
  const hue = { Running: 210, Sneakers: 240, 'Casual shoes': 35, Formal: 20, Boots: 28, Basketball: 8, Outdoor: 115 }[category] ?? 0
  return `${base}&h=900&w=900&crop=${crop}&sat=${secondary ? -8 : 8}&hue=${hue}&sig=kick-${index + 1}-${secondary ? 'alt' : 'main'}`
}

function getFirstImage(images) {
  if (!images) return null
  if (Array.isArray(images)) return images[0] ?? null
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images)
      if (Array.isArray(parsed)) return parsed[0] ?? null
      return parsed
    } catch {
      return images
    }
  }
  return null
}

const BRANDS = ['Nike', 'Adidas', 'Jordan', 'Puma', 'New Balance', 'Asics', 'Reebok']
const MODEL_PREFIXES = ['Air Max', 'Ultraboost', 'Retro High', 'Court Vision', 'Velocity', 'Summit', 'Metro', 'Legacy', 'Quantum', 'Cloud', 'Pulse', 'Blazer', 'Zoom', 'Vapor', 'Classic', 'Ignite', 'Phantom', 'Titan']
const MODEL_SUFFIXES = ['Pro', 'V2', 'Ultra', 'GT', 'Elite', 'Lite', 'SE', 'OG', 'NX', 'Apex', 'EVO', 'Prime']
const GENDERS = ['men', 'women', 'unisex']
const MATERIALS = ['Knit Upper', 'Genuine Leather', 'Synthetic Mesh', 'Suede', 'Canvas', 'Nubuck']
const COLOR_PALETTES = [
  ['Black', 'White'],
  ['Blue', 'White'],
  ['Red', 'Black'],
  ['Green', 'White'],
  ['Grey', 'Black'],
  ['Yellow', 'Black'],
  ['Pink', 'White'],
  ['Brown', 'Tan'],
]

const SIZES = ['38', '39', '40', '41', '42', '43', '44', '45', '46', '47']

function generate200Products() {
  const products = []
  let count = 1

  const catNames = ['Running', 'Sneakers', 'Casual shoes', 'Formal', 'Boots', 'Basketball', 'Outdoor']

  for (let i = 0; i < 210; i++) {
    const brand = BRANDS[i % BRANDS.length]
    const prefix = MODEL_PREFIXES[i % MODEL_PREFIXES.length]
    const suffix = MODEL_SUFFIXES[(i * 3) % MODEL_SUFFIXES.length]
    const category = catNames[i % catNames.length]
    const name = `${brand} ${prefix} ${suffix} ${i + 1}`.toUpperCase()
    const sku = `KICK-${category.substring(0, 3).toUpperCase()}-${String(count).padStart(4, '0')}`
    const price = Math.round((49.99 + (i % 25) * 8.5) * 100) / 100
    const compareAt = i % 3 === 0 ? Math.round((price * 1.25) * 100) / 100 : null
    const gender = GENDERS[i % GENDERS.length]
    const material = MATERIALS[i % MATERIALS.length]
    const colors = COLOR_PALETTES[i % COLOR_PALETTES.length]
    const image = imageForProduct(i, category, false)
    const secondaryImage = imageForProduct(i, category, true)
    const isFeatured = i < 20 || i % 7 === 0

    products.push({
      name,
      category,
      sku,
      brand,
      price,
      compareAt,
      gender,
      material,
      colors,
      images: [image, secondaryImage],
      tags: [category.toLowerCase(), brand.toLowerCase(), gender, 'footwear'],
      featured: isFeatured,
      description: `Premium ${brand} ${name} designed for maximum performance, comfort, and style. Engineered with ${material} and durable traction outer sole.`
    })
    count++
  }

  return products
}

export async function seedDatabase() {
  logger.info('Starting full database seed execution...')

  // 1. Ensure Admin User
  const [adminCheck] = await pool.query('SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL])
  if (!adminCheck.length) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, env.bcryptRounds)
    await pool.query(
      `INSERT INTO users (public_id, role, first_name, last_name, email, password_hash, status, email_verified_at)
       VALUES (?, 'admin', 'Kicks', 'Admin', ?, ?, 'active', NOW())`,
      [publicId(), ADMIN_EMAIL, hash]
    )
    logger.info(`Admin created: ${ADMIN_EMAIL}`)
  }

  // 2. Ensure 25+ Customer Users
  const customerNames = [
    ['Priya', 'Sharma'], ['Rahul', 'Verma'], ['Alex', 'Johnson'], ['Sarah', 'Smith'],
    ['Michael', 'Brown'], ['Emma', 'Davis'], ['David', 'Wilson'], ['Sophia', 'Taylor'],
    ['Daniel', 'Anderson'], ['Olivia', 'Thomas'], ['James', 'Jackson'], ['Ava', 'White'],
    ['Logan', 'Harris'], ['Isabella', 'Martin'], ['Lucas', 'Thompson'], ['Mia', 'Garcia'],
    ['Ethan', 'Martinez'], ['Harper', 'Robinson'], ['Mason', 'Clark'], ['Evelyn', 'Rodriguez'],
    ['Oliver', 'Lewis'], ['Charlotte', 'Lee'], ['Jacob', 'Walker'], ['Amelia', 'Hall']
  ]

  const userIds = []
  for (let i = 0; i < customerNames.length; i++) {
    const [fn, ln] = customerNames[i]
    const email = `customer${i + 1}@example.com`.toLowerCase()
    const [uCheck] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
    if (uCheck.length) {
      userIds.push(uCheck[0].id)
    } else {
      const hash = await bcrypt.hash('Password123', env.bcryptRounds)
      const [res] = await pool.query(
        `INSERT INTO users (public_id, role, first_name, last_name, email, password_hash, phone, status, email_verified_at, preferred_size, address_line1, address_city, address_state, address_postal, address_country, created_at)
         VALUES (?, 'customer', ?, ?, ?, ?, ?, 'active', NOW(), ?, '100 Main St', 'New York', 'NY', '10001', 'USA', TIMESTAMPADD(DAY, -?, NOW()))`,
        [publicId(), fn, ln, email, hash, `+1 555-010${i}`, String(38 + (i % 8)), i * 2]
      )
      userIds.push(res.insertId)
    }
  }

  // 3. Ensure Categories
  const categoryMap = new Map()
  for (const [index, category] of CATEGORIES.entries()) {
    const slug = slugify(category.name)
    const [rows] = await pool.query('SELECT id FROM categories WHERE slug = ?', [slug])
    if (rows.length) {
      categoryMap.set(category.name, rows[0].id)
    } else {
      const [result] = await pool.query(
        `INSERT INTO categories (public_id, name, slug, description, color, image_url, sort_order)
         VALUES (?,?,?,?,?,?,?)`,
        [publicId(), category.name, slug, category.description, category.color, category.image, index + 1]
      )
      categoryMap.set(category.name, result.insertId)
    }
  }

  // 4. Seed 200+ Products & Variants
  const products = generate200Products()
  let createdCount = 0

  for (const p of products) {
    const slug = slugify(p.name)

    const [existing] = await pool.query(
      'SELECT id FROM products WHERE sku = ? OR slug = ?',
      [p.sku, slug]
    )

    if (existing.length) continue

    const categoryId = categoryMap.get(p.category) || categoryMap.get('Sneakers')
    const [prodResult] = await pool.query(
      `INSERT INTO products
         (public_id, category_id, name, slug, sku, description, brand, gender,
          material, price, compare_at_price, cost_per_item, status, is_featured,
          images, tags, rating_avg, rating_count, total_stock)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'active',?,?,?,?,?,100)`,
      [
        publicId(), categoryId, p.name,
        slug, p.sku, p.description,
        p.brand, p.gender, p.material, p.price,
        p.compareAt, Number((p.price * 0.45).toFixed(2)),
        p.featured ? 1 : 0,
        JSON.stringify(p.images), JSON.stringify(p.tags),
        (4.2 + (createdCount % 8) * 0.1).toFixed(1), 25 + (createdCount * 7) % 300,
      ]
    )

    const productId = prodResult.insertId
    createdCount++

    // Add variants for size and color
    for (const color of p.colors) {
      for (const size of SIZES) {
        await pool.query(
          `INSERT INTO product_variants (public_id, product_id, size, color, sku, stock)
           VALUES (?,?,?,?,?,?)`,
          [
            publicId(), productId, size, color,
            `${p.sku}-${size}-${colorCode(color)}`,
            15 + ((productId + Number(size)) % 25),
          ]
        )
      }
    }

    await pool.query(
      `UPDATE products p
       SET p.total_stock = (SELECT COALESCE(SUM(v.stock), 0) FROM product_variants v WHERE v.product_id = p.id)
       WHERE p.id = ?`,
      [productId]
    )
  }

  logger.info({ totalProductsSeeded: createdCount }, '200+ Products & Variants created successfully.')

  // 5. Seed 120 realistic orders
  const [allProds] = await pool.query('SELECT id, public_id, name, slug, sku, price, images FROM products LIMIT 50')
  const statuses = ['delivered', 'shipped', 'processing', 'pending', 'cancelled', 'returned']

  if (allProds.length > 0 && userIds.length > 0) {
    const [existingOrders] = await pool.query('SELECT COUNT(*) as count FROM orders')
    if (existingOrders[0].count < 100) {
      for (let i = 0; i < 120; i++) {
        const user = userIds[i % userIds.length]
        const status = statuses[i % statuses.length]
        const p1 = allProds[i % allProds.length]
        const p2 = allProds[(i + 3) % allProds.length]
        const qty1 = 1 + (i % 2)
        const qty2 = i % 3 === 0 ? 1 : 0

        const price1 = Number(p1.price)
        const price2 = Number(p2.price)
        const lineTotal1 = Number((price1 * qty1).toFixed(2))
        const lineTotal2 = qty2 ? Number((price2 * qty2).toFixed(2)) : 0

        const subtotal = Number((lineTotal1 + lineTotal2).toFixed(2))
        const tax = Number((subtotal * 0.08).toFixed(2))
        const shipping = subtotal > 150 ? 0 : 9.99
        const grandTotal = Number((subtotal + tax + shipping).toFixed(2))

        const orderNum = `ORD-2026-${String(i + 101).padStart(4, '0')}`
        const daysAgo = Math.floor(i * 4)

        const [existingOrder] = await pool.query('SELECT id FROM orders WHERE order_number = ?', [orderNum])
        if (existingOrder.length) continue

        const [fn, ln] = customerNames[i % customerNames.length]
        const custName = `${fn} ${ln}`
        const custEmail = `customer${(i % customerNames.length) + 1}@example.com`.toLowerCase()

        const [ordRes] = await pool.query(
          `INSERT INTO orders (public_id, user_id, order_number, customer_email, customer_name, status, subtotal, tax_total, shipping_total, grand_total, payment_status, payment_method, shipping_name, shipping_line1, shipping_city, shipping_state, shipping_postal, shipping_country, placed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'cod', ?, '100 Main St', 'New York', 'NY', '10001', 'USA', TIMESTAMPADD(DAY, -?, NOW()))`,
          [publicId(), user, orderNum, custEmail, custName, status, subtotal, tax, shipping, grandTotal, custName, daysAgo]
        )

        const orderId = ordRes.insertId

        await pool.query(
          `INSERT INTO order_items (order_id, product_id, product_name, product_slug, product_sku, product_image, color, size, unit_price, quantity, line_total)
           VALUES (?, ?, ?, ?, ?, ?, 'Black', '42', ?, ?, ?)`,
          [orderId, p1.id, p1.name, p1.slug, p1.sku, getFirstImage(p1.images), price1, qty1, lineTotal1]
        )

        if (qty2) {
          await pool.query(
            `INSERT INTO order_items (order_id, product_id, product_name, product_slug, product_sku, product_image, color, size, unit_price, quantity, line_total)
             VALUES (?, ?, ?, ?, ?, ?, 'White', '40', ?, ?, ?)`,
            [orderId, p2.id, p2.name, p2.slug, p2.sku, getFirstImage(p2.images), price2, qty2, lineTotal2]
          )
        }
      }
      logger.info('120 realistic orders seeded into database.')
    }
  }

  const [[counts]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM users) users,
            (SELECT COUNT(*) FROM categories) categories,
            (SELECT COUNT(*) FROM products) products,
            (SELECT COUNT(*) FROM product_variants) variants,
            (SELECT COUNT(*) FROM orders) orders`
  )

  const [[imageCounts]] = await pool.query(
    `SELECT COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(images, '$[0]'))) AS unique_main_images
     FROM products
     WHERE images IS NOT NULL AND JSON_LENGTH(images) > 0`
  )

  const required = { products: 100, users: 11, orders: 100 }
  if (Number(counts.products) < required.products || Number(counts.users) < required.users || Number(counts.orders) < required.orders) {
    throw new Error(`Seed verification failed: expected at least ${required.products} products, ${required.users} users and ${required.orders} orders; got ${counts.products}/${counts.users}/${counts.orders}.`)
  }
  if (Number(imageCounts.unique_main_images) < required.products) {
    throw new Error(`Seed verification failed: expected a unique main image URL for every product; found ${imageCounts.unique_main_images}.`)
  }

  logger.info({ ...counts, uniqueMainImages: imageCounts.unique_main_images }, 'Full Database Seed Complete!')
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedDatabase()
    .then(closePool)
    .catch(async (err) => {
      logger.fatal({ err }, 'seed failed')
      await closePool().catch(() => {})
      process.exit(1)
    })
}