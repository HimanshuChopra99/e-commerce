import { faker } from '@faker-js/faker'
import { tierForSpend } from '@/features/customers/customers-data'
import { couriers } from '@/features/orders/orders-data'
import { LOW_STOCK_THRESHOLD, sizeRun } from '@/features/products/products-data'
/* -------------------------------------------------------------------------- */
/*  Single source of truth for the demo catalogue.                            */
/*  Products, customers and orders are generated together so every order      */
/*  points at a real product + real customer, and every customer's totals     */
/*  are computed from their actual order history.                             */
/*                                                                            */
/*  👉 Swap these exports for API calls when you connect a real backend.      */
/* -------------------------------------------------------------------------- */

faker.seed(20260728)

/**
 * "Today" for the demo dataset. Keep this in sync with `src/data/stats.ts`
 * so the dashboard's 30-day windows line up with the generated orders.
 */
export const DEMO_NOW = new Date('2026-07-28T18:00:00.000Z')

/** Curated catalogue seeds — expanded into colourways below. */

const catalog = [
  {
    name: 'Aero Runner 2.0',
    category: 'running',
    gender: 'unisex',
    price: 129.99,
    compareAt: 159.99,
    material: 'Mesh',
    image: '/products/running-01.png',
    colors: ['Black', 'White', 'Blue'],
    description:
      'A featherweight daily trainer built for long miles. The engineered mesh upper breathes on hot runs while a responsive foam midsole returns energy with every stride.',
    tags: ['running', 'lightweight', 'daily-trainer'],
  },
  {
    name: 'Velocity Pro Racer',
    category: 'running',
    gender: 'men',
    price: 179.99,
    compareAt: 199.99,
    material: 'Knit',
    image: '/products/running-02.png',
    colors: ['Red', 'Black', 'Yellow'],
    description:
      'Our fastest silhouette yet. A carbon-infused plate and race-day foam make this the shoe you reach for when the clock matters.',
    tags: ['running', 'race-day', 'performance'],
  },
  {
    name: 'Metro Classic Low',
    category: 'sneakers',
    gender: 'unisex',
    price: 89.99,
    material: 'Canvas',
    image: '/products/sneaker-01.png',
    colors: ['White', 'Black', 'Navy'],
    description:
      'The everyday low-top that goes with everything. Durable canvas upper, vulcanised rubber sole and a cushioned insole for all-day wear.',
    tags: ['sneakers', 'casual', 'everyday'],
  },
  {
    name: 'Street Court Hi',
    category: 'sneakers',
    gender: 'unisex',
    price: 109.99,
    compareAt: 129.99,
    material: 'Genuine Leather',
    image: '/products/sneaker-02.png',
    colors: ['White', 'Green', 'Grey'],
    description:
      'A high-top court classic rebuilt in premium leather. Padded collar, reinforced toe and a heritage outline that never dates.',
    tags: ['sneakers', 'high-top', 'leather'],
  },
  {
    name: 'Executive Oxford',
    category: 'formal',
    gender: 'men',
    price: 189.99,
    material: 'Genuine Leather',
    image: '/products/formal-01.png',
    colors: ['Black', 'Brown'],
    description:
      'A hand-finished Oxford in full-grain leather with a Goodyear welted sole. Board-room ready and built to be resoled for years.',
    tags: ['formal', 'office', 'leather'],
  },
  {
    name: 'Heritage Derby',
    category: 'formal',
    gender: 'men',
    price: 159.99,
    compareAt: 189.99,
    material: 'Suede',
    image: '/products/formal-02.png',
    colors: ['Brown', 'Navy', 'Tan'],
    description:
      'A softer take on the dress shoe. Open-lace derby construction in brushed suede that pairs as easily with denim as with a suit.',
    tags: ['formal', 'suede', 'smart-casual'],
  },
  {
    name: 'Summit Trail Boot',
    category: 'boots',
    gender: 'unisex',
    price: 219.99,
    material: 'Nubuck',
    image: '/products/boot-01.png',
    colors: ['Brown', 'Black', 'Green'],
    description:
      'A waterproof hiking boot with a grippy lugged outsole, ankle support and a sealed nubuck upper that shrugs off weather.',
    tags: ['boots', 'hiking', 'waterproof'],
  },
  {
    name: 'Urban Chelsea Boot',
    category: 'boots',
    gender: 'women',
    price: 169.99,
    material: 'Genuine Leather',
    image: '/products/boot-01.png',
    colors: ['Black', 'Tan', 'Brown'],
    description:
      'Clean lines, elastic side panels and a stacked heel. The pull-on boot that finishes an outfit in one step.',
    tags: ['boots', 'chelsea', 'leather'],
  },
  {
    name: 'Coastal Slide',
    category: 'sandals',
    gender: 'unisex',
    price: 49.99,
    compareAt: 69.99,
    material: 'Rubber',
    image: '/products/sneaker-03.png',
    colors: ['Black', 'Beige', 'Blue'],
    description:
      'A contoured footbed slide for post-workout and poolside. Quick-dry, odour-resistant and impossibly light.',
    tags: ['sandals', 'summer', 'slides'],
  },
  {
    name: 'Court Ace Trainer',
    category: 'sports',
    gender: 'men',
    price: 139.99,
    material: 'Synthetic Leather',
    image: '/products/sneaker-02.png',
    colors: ['White', 'Blue', 'Grey'],
    description:
      'Built for lateral movement. A reinforced midfoot cage and herringbone outsole keep you planted through hard cuts.',
    tags: ['sports', 'court', 'training'],
  },
  {
    name: 'Soft Step Loafer',
    category: 'loafers',
    gender: 'women',
    price: 119.99,
    material: 'Suede',
    image: '/products/formal-02.png',
    colors: ['Beige', 'Black', 'Pink'],
    description:
      'A slip-on loafer with a memory-foam footbed and flexible sole. Smart enough for the office, soft enough for the commute.',
    tags: ['loafers', 'slip-on', 'comfort'],
  },
  {
    name: 'Evening Stiletto',
    category: 'heels',
    gender: 'women',
    price: 149.99,
    compareAt: 179.99,
    material: 'Synthetic Leather',
    image: '/products/heel-01.png',
    colors: ['Black', 'Red', 'Beige'],
    description:
      'A 90mm stiletto with a cushioned insole and balanced heel pitch — the rare occasion shoe you can actually stand in all night.',
    tags: ['heels', 'occasion', 'evening'],
  },
  {
    name: 'Cloud Walk Slip-On',
    category: 'sneakers',
    gender: 'women',
    price: 94.99,
    material: 'Knit',
    image: '/products/sneaker-03.png',
    colors: ['Grey', 'Pink', 'White'],
    description:
      'A laceless knit sneaker that packs flat and slips on in a second. Machine washable and built for travel days.',
    tags: ['sneakers', 'slip-on', 'travel'],
  },
  {
    name: 'Junior Dash',
    category: 'sports',
    gender: 'kids',
    price: 59.99,
    material: 'Mesh',
    image: '/products/running-01.png',
    colors: ['Blue', 'Red', 'Green'],
    description:
      'A school-run and playground shoe with hook-and-loop straps, a scuff-resistant toe bumper and a flexible grippy sole.',
    tags: ['kids', 'school', 'velcro'],
  },
  {
    name: 'Trailblazer GTX',
    category: 'boots',
    gender: 'men',
    price: 249.99,
    material: 'Nubuck',
    image: '/products/boot-01.png',
    colors: ['Brown', 'Grey'],
    description:
      'Our most technical boot. A waterproof membrane, shank-supported midsole and deep lugs for multi-day loads on rough ground.',
    tags: ['boots', 'hiking', 'technical'],
  },
  {
    name: 'Retro Wave 84',
    category: 'sneakers',
    gender: 'unisex',
    price: 99.99,
    compareAt: 119.99,
    material: 'Suede',
    image: '/products/sneaker-04.png',
    colors: ['Navy', 'Beige', 'Yellow'],
    description:
      'A suede-and-mesh runner pulled straight from the archive, rebuilt on a modern cushioned sole for everyday comfort.',
    tags: ['sneakers', 'retro', 'suede'],
  },
]

/**
 * Maps the fixed catalogue category onto a seeded admin category id.
 * Categories not covered here start life unassigned, which is realistic —
 * it gives you products to file into your own categories from the UI.
 */
const seedCategoryIdFor = {
  running: 'CAT-RUNNING',
  sneakers: 'CAT-SNEAKERS',
  formal: 'CAT-FORMAL',
  boots: 'CAT-BOOTS',
}
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/* ----------------------------- Products ---------------------------------- */

function buildProducts() {
  const products = []
  let counter = 1
  catalog.forEach((seed) => {
    // Each catalogue entry ships as 2-3 colourway products.
    const colorwayCount = faker.number.int({
      min: 2,
      max: 3,
    })
    const chosen = faker.helpers
      .shuffle([...seed.colors])
      .slice(0, colorwayCount)
    chosen.forEach((color, idx) => {
      const isPrimary = idx === 0
      const name = isPrimary ? seed.name : `${seed.name} — ${color}`

      // Every catalogue gets a realistic spread of inventory health so the
      // low-stock / out-of-stock features in the UI actually have data.
      const stockProfile = faker.helpers.weightedArrayElement([
        {
          weight: 70,
          value: 'healthy',
        },
        {
          weight: 20,
          value: 'low',
        },
        {
          weight: 10,
          value: 'out',
        },
      ])
      let variants
      if (stockProfile === 'out') {
        variants = sizeRun.map((size) => ({
          size,
          stock: 0,
        }))
      } else if (stockProfile === 'low') {
        // Only a couple of sizes left, a few pairs each (stays under the
        // LOW_STOCK_THRESHOLD of 12).
        const leftover = faker.helpers.shuffle([...sizeRun]).slice(
          0,
          faker.number.int({
            min: 2,
            max: 3,
          })
        )
        variants = sizeRun.map((size) => ({
          size,
          stock: leftover.includes(size)
            ? faker.number.int({
                min: 1,
                max: 4,
              })
            : 0,
        }))
      } else {
        // Size/stock matrix: mid sizes carry more stock than the extremes.
        variants = sizeRun.map((size) => {
          const mid = Math.abs(Number(size) - 8.5)
          const base = Math.max(0, 26 - Math.round(mid * 5))
          return {
            size,
            stock: faker.number.int({
              min: 0,
              max: Math.max(2, base),
            }),
          }
        })
      }
      const totalStock = variants.reduce((sum, v) => sum + v.stock, 0)

      // Out-of-stock is derived from inventory; the rest is weighted so every
      // status filter in the UI has something to show.
      const status =
        totalStock === 0
          ? 'out_of_stock'
          : faker.helpers.weightedArrayElement([
              {
                weight: 78,
                value: 'active',
              },
              {
                weight: 14,
                value: 'draft',
              },
              {
                weight: 8,
                value: 'archived',
              },
            ])
      const createdAt = faker.date.between({
        from: '2025-01-10',
        to: '2026-06-20',
      })
      products.push({
        id: `PRD-${String(counter).padStart(4, '0')}`,
        name,
        slug: slugify(name),
        sku: `SS-${seed.category.slice(0, 3).toUpperCase()}-${String(counter).padStart(4, '0')}`,
        description: seed.description,
        image: seed.image,
        images: [seed.image],
        category: seed.category,
        categoryId: seedCategoryIdFor[seed.category] ?? null,
        gender: seed.gender,
        brand: 'Kick',
        price: isPrimary
          ? seed.price
          : Number(
              (
                seed.price +
                faker.number.int({
                  min: -8,
                  max: 12,
                })
              ).toFixed(2)
            ),
        compareAtPrice: seed.compareAt ?? null,
        costPerItem: Number((seed.price * 0.45).toFixed(2)),
        status,
        featured: faker.datatype.boolean({
          probability: 0.25,
        }),
        colors: [color],
        variants,
        totalStock,
        sold: faker.number.int({
          min: 4,
          max: 480,
        }),
        rating: Number(
          faker.number
            .float({
              min: 3.4,
              max: 5,
              fractionDigits: 1,
            })
            .toFixed(1)
        ),
        reviews: faker.number.int({
          min: 3,
          max: 620,
        }),
        material: seed.material,
        tags: seed.tags,
        createdAt,
        updatedAt: faker.date.between({
          from: createdAt,
          to: '2026-07-25',
        }),
      })
      counter += 1
    })
  })
  return products
}
export const products = buildProducts()

/** Products that are sellable — used when generating orders. */
const sellableProducts = products.filter((p) => p.status !== 'archived')

/* ----------------------------- Customers --------------------------------- */

const indianCities = [
  ['Mumbai', 'Maharashtra'],
  ['Delhi', 'Delhi'],
  ['Bengaluru', 'Karnataka'],
  ['Chandigarh', 'Punjab'],
  ['Pune', 'Maharashtra'],
  ['Hyderabad', 'Telangana'],
  ['Chennai', 'Tamil Nadu'],
  ['Jaipur', 'Rajasthan'],
  ['Ahmedabad', 'Gujarat'],
  ['Kolkata', 'West Bengal'],
  ['Lucknow', 'Uttar Pradesh'],
  ['Indore', 'Madhya Pradesh'],
]
function buildBaseCustomers(count) {
  return Array.from(
    {
      length: count,
    },
    (_, i) => {
      const firstName = faker.person.firstName()
      const lastName = faker.person.lastName()
      const [city, state] = faker.helpers.arrayElement(indianCities)
      const createdAt = faker.date.between({
        from: '2025-01-01',
        to: DEMO_NOW,
      })
      const status = faker.helpers.weightedArrayElement([
        {
          weight: 78,
          value: 'active',
        },
        {
          weight: 18,
          value: 'inactive',
        },
        {
          weight: 4,
          value: 'blocked',
        },
      ])
      return {
        id: `CUS-${String(i + 1).padStart(4, '0')}`,
        firstName,
        lastName,
        email: faker.internet
          .email({
            firstName,
            lastName,
            provider: 'gmail.com',
          })
          .toLowerCase(),
        phone: `+91 ${faker.string.numeric({
          length: 5,
        })} ${faker.string.numeric({
          length: 5,
        })}`,
        avatar: '',
        status,
        shippingAddress: {
          line1: `${faker.number.int({
            min: 1,
            max: 480,
          })}, ${faker.location.street()}`,
          city,
          state,
          zip: faker.string.numeric({
            length: 6,
          }),
          country: 'India',
        },
        preferredSize: faker.helpers.arrayElement([...sizeRun]),
        marketingOptIn: faker.datatype.boolean({
          probability: 0.62,
        }),
        notes: '',
        createdAt,
        updatedAt: createdAt,
      }
    }
  )
}
const baseCustomers = buildBaseCustomers(180)

/* ------------------------------- Orders ---------------------------------- */

function buildOrders() {
  const result = []
  let counter = 1000
  baseCustomers.forEach((customer) => {
    // Blocked/inactive shoppers order less; active shoppers order more.
    const max =
      customer.status === 'active' ? 6 : customer.status === 'inactive' ? 2 : 1
    const orderCount = faker.number.int({
      min: 0,
      max,
    })
    for (let i = 0; i < orderCount; i += 1) {
      counter += 1
      const lineCount = faker.number.int({
        min: 1,
        max: 3,
      })
      const picked = faker.helpers
        .shuffle([...sellableProducts])
        .slice(0, lineCount)
      const items = picked.map((product) => {
        const quantity = faker.number.int({
          min: 1,
          max: 2,
        })
        return {
          productId: product.id,
          name: product.name,
          image: product.image,
          sku: product.sku,
          size: faker.helpers.arrayElement([...sizeRun]),
          color: product.colors[0] ?? 'Black',
          quantity,
          price: product.price,
        }
      })
      const subtotal = Number(
        items.reduce((sum, it) => sum + it.price * it.quantity, 0).toFixed(2)
      )
      const shipping = subtotal > 150 ? 0 : 9.99
      const discount = faker.datatype.boolean({
        probability: 0.28,
      })
        ? Number(
            (subtotal * faker.helpers.arrayElement([0.05, 0.1, 0.15])).toFixed(
              2
            )
          )
        : 0
      const tax = Number(((subtotal - discount) * 0.08).toFixed(2))
      const total = Number((subtotal + shipping + tax - discount).toFixed(2))
      const placedAt = faker.date.between({
        from: customer.createdAt,
        to: DEMO_NOW,
      })

      // Older orders are more likely to have completed their journey.
      const ageDays = (DEMO_NOW.getTime() - placedAt.getTime()) / 86_400_000
      let status
      if (ageDays < 2) {
        status = faker.helpers.weightedArrayElement([
          {
            weight: 55,
            value: 'pending',
          },
          {
            weight: 35,
            value: 'processing',
          },
          {
            weight: 10,
            value: 'cancelled',
          },
        ])
      } else if (ageDays < 7) {
        status = faker.helpers.weightedArrayElement([
          {
            weight: 12,
            value: 'processing',
          },
          {
            weight: 55,
            value: 'shipped',
          },
          {
            weight: 25,
            value: 'delivered',
          },
          {
            weight: 8,
            value: 'cancelled',
          },
        ])
      } else {
        status = faker.helpers.weightedArrayElement([
          {
            weight: 78,
            value: 'delivered',
          },
          {
            weight: 6,
            value: 'shipped',
          },
          {
            weight: 8,
            value: 'cancelled',
          },
          {
            weight: 8,
            value: 'returned',
          },
        ])
      }
      const paymentMethod = faker.helpers.weightedArrayElement([
        {
          weight: 42,
          value: 'card',
        },
        {
          weight: 26,
          value: 'upi',
        },
        {
          weight: 12,
          value: 'paypal',
        },
        {
          weight: 14,
          value: 'cod',
        },
        {
          weight: 6,
          value: 'net_banking',
        },
      ])
      let paymentStatus = 'paid'
      if (status === 'cancelled')
        paymentStatus = faker.helpers.arrayElement(['refunded', 'failed'])
      else if (status === 'returned') paymentStatus = 'refunded'
      else if (status === 'pending')
        paymentStatus =
          paymentMethod === 'cod'
            ? 'pending'
            : faker.helpers.arrayElement(['paid', 'pending'])
      const shipped = ['shipped', 'delivered', 'returned'].includes(status)
      const deliveredAt =
        status === 'delivered' || status === 'returned'
          ? faker.date.between({
              from: placedAt,
              to: new Date(
                Math.min(
                  placedAt.getTime() + 7 * 86_400_000,
                  DEMO_NOW.getTime()
                )
              ),
            })
          : null
      result.push({
        id: `ORD-${counter}`,
        orderNumber: `#${counter}`,
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        items,
        itemCount: items.reduce((sum, it) => sum + it.quantity, 0),
        subtotal,
        shipping,
        tax,
        discount,
        total,
        status,
        paymentStatus,
        paymentMethod,
        shippingAddress: customer.shippingAddress,
        trackingNumber: shipped
          ? `${faker.string.alpha({
              length: 2,
              casing: 'upper',
            })}${faker.string.numeric({
              length: 10,
            })}`
          : null,
        courier: shipped ? faker.helpers.arrayElement(couriers) : null,
        notes: '',
        placedAt,
        updatedAt: deliveredAt ?? placedAt,
        deliveredAt,
      })
    }
  })
  return result.sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime())
}
export const orders = buildOrders()

/* ------------------- Customers enriched with order history ---------------- */

/** Orders that count toward lifetime value (cancelled orders don't). */
const revenueOrders = orders.filter((o) => o.status !== 'cancelled')
export const customers = baseCustomers.map((customer) => {
  const own = revenueOrders.filter((o) => o.customerId === customer.id)
  const totalSpent = Number(own.reduce((sum, o) => sum + o.total, 0).toFixed(2))
  const totalOrders = own.length
  const lastOrderAt = own.length
    ? own.map((o) => o.placedAt).sort((a, b) => b.getTime() - a.getTime())[0]
    : null
  return {
    ...customer,
    totalOrders,
    totalSpent,
    avgOrderValue: totalOrders
      ? Number((totalSpent / totalOrders).toFixed(2))
      : 0,
    tier: tierForSpend(totalSpent),
    lastOrderAt,
    updatedAt: lastOrderAt ?? customer.updatedAt,
  }
})

/* ----------------------------- Selectors --------------------------------- */

export const getProductById = (id) => products.find((p) => p.id === id) ?? null
export const getCustomerById = (id) =>
  customers.find((c) => c.id === id) ?? null
export const getOrderById = (id) => orders.find((o) => o.id === id) ?? null
export const getOrdersByCustomer = (customerId) =>
  orders
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime())

/** Products at or below the low-stock threshold (excluding archived). */
export const getLowStockProducts = () =>
  products
    .filter(
      (p) => p.status !== 'archived' && p.totalStock <= LOW_STOCK_THRESHOLD
    )
    .sort((a, b) => a.totalStock - b.totalStock)

/** Best sellers by units sold. */
export const getTopProducts = (limit = 5) =>
  [...products].sort((a, b) => b.sold - a.sold).slice(0, limit)
