import bcrypt from 'bcryptjs'
import { slugify, publicId } from '../utils/helpers.js'

const unsplashImages = [
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512374382149-233c42b6a83b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1605348532760-6753d2c43329?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1617606002779-51d866bdd1d1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1562183241-b937e95585b6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1588117305388-c26305436df8?auto=format&fit=crop&w=800&q=80',
]

const CATEGORIES_DATA = [
  { name: 'Running', color: 'blue', image: unsplashImages[0], description: 'Road and trail shoes built for distance, speed and daily training.' },
  { name: 'Sneakers', color: 'teal', image: unsplashImages[1], description: 'Everyday low-tops, high-tops and lifestyle silhouettes.' },
  { name: 'Formal', color: 'slate', image: unsplashImages[2], description: 'Oxfords, derbies and loafers for the office and formal occasions.' },
  { name: 'Boots', color: 'amber', image: unsplashImages[3], description: 'Hiking, chelsea and weatherproof boots for rough ground.' },
  { name: 'Training', color: 'rose', image: unsplashImages[4], description: 'High-intensity gym, crossfit and weightlifting footwear.' },
  { name: 'Basketball', color: 'violet', image: unsplashImages[5], description: 'High-top ankle support and court responsive traction.' },
]

// Seed passwords come from env vars, never from source code.
// Defaults are for local dev ONLY. Rotate before any deployment.
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!'
const CUSTOMER_PASSWORD = process.env.SEED_CUSTOMER_PASSWORD || 'Password123'

const USERS_DATA = [
  {
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@kick.com',
    phone: '+1 555-0199',
    preferredSize: '10',
    address: { line1: '100 Admin Plaza', city: 'San Francisco', state: 'CA', postalCode: '94105', country: 'USA' },
  },
  {
    role: 'customer',
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'customer@example.com',
    phone: '+1 555-0122',
    preferredSize: '8',
    address: { line1: '12 Marine Drive', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'India' },
  },
  {
    role: 'customer',
    firstName: 'Alex',
    lastName: 'Rivera',
    email: 'alex.rivera@example.com',
    phone: '+1 555-0144',
    preferredSize: '9',
    address: { line1: '742 Evergreen Terrace', city: 'Austin', state: 'TX', postalCode: '78701', country: 'USA' },
  },
  {
    role: 'customer',
    firstName: 'Jordan',
    lastName: 'Lee',
    email: 'jordan.lee@example.com',
    phone: '+1 555-0166',
    preferredSize: '10',
    address: { line1: '450 Kingsway', city: 'Vancouver', state: 'BC', postalCode: 'V5T 3J8', country: 'Canada' },
  },
  {
    role: 'customer',
    firstName: 'Samira',
    lastName: 'Patel',
    email: 'samira.patel@example.com',
    phone: '+1 555-0188',
    preferredSize: '7',
    address: { line1: '88 Baker Street', city: 'London', state: 'England', postalCode: 'NW1 6XE', country: 'UK' },
  },
]

function generateProducts() {
  const prefixes = [
    'Aero', 'Velocity', 'Metro', 'Street', 'Executive', 'Summit', 'Urban', 'Glide', 'Apex', 'Pulse',
    'Nitro', 'Endurance', 'Marathon', 'Hyper', 'Horizon', 'Cloud', 'Zenith', 'Pure', 'Flyknit', 'Volt',
    'Heritage', 'Royal', 'Monk', 'Brogue', 'Chukka', 'Timber', 'Explorer', 'Stealth', 'Slam', 'Crossfit',
    'Retro', 'Cyber', 'Terrace', 'Neon', 'Grand', 'Legend', 'Air', 'Court', 'Vapor', 'Zoom',
    'Titan', 'Nova', 'React', 'Pegasus', 'Force', 'Infinity', 'Lunar', 'Free', 'Structure', 'Winflo'
  ]

  const suffixes = [
    'Runner', 'Pro Racer', 'Classic Low', 'Court Hi', 'Oxford', 'Trail Boot', 'Chelsea', 'Trainer',
    'StriderMax', 'Speedster', 'Flow', 'Suede Loafer', 'Desert Chukka', 'Dunk High', 'Skate Pro',
    'Slide', 'Marathon Ultra', 'Pace 3.0', 'Elevation', 'Ground Grip', 'Wingtip', 'Tuxedo Dress',
    'Cross Trainer', 'Ankle Guard', 'Slip-On', 'Platform', 'Vapor Max', 'Court Legend', 'Zero Gravity'
  ]

  const genders = ['men', 'women', 'unisex']
  const materials = ['Mesh', 'Knit', 'Canvas', 'Genuine Leather', 'Suede', 'Nubuck', 'Synthetic']
  const categoryNames = ['Running', 'Sneakers', 'Formal', 'Boots', 'Training', 'Basketball']
  const colorsList = [
    ['Black', 'White'], ['Red', 'Black'], ['Blue', 'Grey'], ['White', 'Green'],
    ['Brown', 'Tan'], ['Black', 'Navy'], ['Olive', 'Black'], ['Pink', 'White']
  ]

  const products = []
  let count = 1

  for (let i = 0; i < prefixes.length; i++) {
    for (let j = 0; j < suffixes.length; j++) {
      if (products.length >= 100) break

      const pName = `${prefixes[i]} ${suffixes[j]}`
      const category = categoryNames[count % categoryNames.length]
      const gender = genders[count % genders.length]
      const material = materials[count % materials.length]
      const colors = colorsList[count % colorsList.length]
      const price = Number((59.99 + (count * 3.7) % 220).toFixed(2))
      const compareAtPrice = count % 3 === 0 ? Number((price * 1.25).toFixed(2)) : null
      const img1 = unsplashImages[(count - 1) % unsplashImages.length]
      const img2 = unsplashImages[count % unsplashImages.length]
      const pId = publicId()

      products.push({
        name: pName,
        category,
        sku: `SS-KICK-${String(count).padStart(4, '0')}`,
        price,
        compareAtPrice,
        gender,
        material,
        colors,
        images: [img1, img2],
        image: img1,
        featured: count % 6 === 0,
        description: `Premium grade ${pName} designed for superior comfort and modern athletic lifestyle. Crafted with high performance ${material.toLowerCase()} upper and responsive cushioning.`,
        tags: [category.toLowerCase(), gender, material.toLowerCase()],
        rating: Number((4.2 + (count % 8) * 0.1).toFixed(1)),
        reviewCount: 15 + count * 3,
        id: pId,
        publicId: pId,
      })

      count++
    }
  }

  return products
}

function buildInitialData() {
  // Create users
  const users = USERS_DATA.map((u, idx) => ({
    id: `USR-${u.role === 'admin' ? 'ADMIN' : `CUST${idx}`}`,
    publicId: `USR-${u.role === 'admin' ? 'ADMIN' : `CUST${idx}`}`,
    internalId: idx + 1,
    role: u.role,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: `${u.firstName} ${u.lastName}`,
    email: u.email.toLowerCase(),
    passwordHash: bcrypt.hashSync(u.role === 'admin' ? ADMIN_PASSWORD : CUSTOMER_PASSWORD, 10),
    phone: u.phone,
    status: 'active',
    emailVerified: true,
    address: u.address,
    preferredSize: u.preferredSize,
    marketingOptIn: true,
    notes: u.role === 'admin' ? 'Administrator' : 'Customer Account',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  // Create categories
  const categories = CATEGORIES_DATA.map((c, idx) => ({
    id: `CAT-${c.name.toUpperCase()}`,
    publicId: `CAT-${c.name.toUpperCase()}`,
    internalId: idx + 1,
    name: c.name,
    slug: slugify(c.name),
    description: c.description,
    color: c.color,
    image: c.image,
    sortOrder: idx + 1,
    productCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  // Generate products
  const rawProducts = generateProducts()
  const sizes = ['38', '39', '40', '41', '42', '43', '44', '45']

  const products = rawProducts.map((p, idx) => {
    const cat = categories.find((c) => c.name === p.category) || categories[0]

    return {
      id: p.id,
      publicId: p.id,
      internalId: idx + 1,
      name: p.name,
      slug: slugify(p.name),
      sku: p.sku,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      costPerItem: Number((p.price * 0.45).toFixed(2)),
      brand: 'Kick',
      gender: p.gender,
      material: p.material,
      status: 'active',
      featured: p.featured,
      inStock: true,
      totalStock: 80,
      unitsSold: 20 + idx * 2,
      rating: p.rating,
      reviewCount: p.reviewCount,
      images: p.images,
      image: p.image,
      colorImages: p.colors.map((color, colorIndex) => ({
        color,
        images: [p.images[colorIndex % p.images.length]],
      })),
      tags: p.tags,
      categoryId: cat.publicId,
      category: { id: cat.publicId, name: cat.name, slug: cat.slug },
      colors: p.colors,
      sizes,
      variants: p.colors.flatMap((col) =>
        sizes.map((sz, vIdx) => {
          const vId = publicId()
          return {
            id: vId,
            publicId: vId,
            internalId: vIdx + 1,
            size: sz,
            color: col,
            stock: 10,
            reserved: 0,
            available: 10,
            inStock: true,
            isActive: true,
          }
        })
      ),
      description: p.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  })

  // Create sample orders
  const orders = Array.from({ length: 15 }).map((_, idx) => {
    const num = 1001 + idx
    const user = users[1 + (idx % 4)]
    const product = products[(idx * 3) % products.length]
    const lineTotal = product.price
    const oId = publicId()

    return {
      id: oId,
      publicId: oId,
      internalId: idx + 1,
      orderNumber: `#${num}`,
      status: idx % 4 === 0 ? 'processing' : idx % 3 === 0 ? 'shipped' : 'delivered',
      paymentStatus: 'paid',
      customer: {
        id: user.publicId,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
      },
      shippingAddress: user.address,
      items: [
        {
          id: publicId(),
          productPublicId: product.publicId,
          productName: product.name,
          productSlug: product.slug,
          productImage: product.image,
          color: product.colors[0],
          size: '42',
          unitPrice: product.price,
          quantity: 1,
          lineTotal,
        },
      ],
      subtotal: lineTotal,
      shippingCost: 0,
      tax: Number((lineTotal * 0.08).toFixed(2)),
      grandTotal: Number((lineTotal * 1.08).toFixed(2)),
      placedAt: new Date(Date.now() - 86400000 * (idx + 1)).toISOString(),
      updatedAt: new Date().toISOString(),
    }
  })

  // Update category product counts
  categories.forEach((cat) => {
    cat.productCount = products.filter((p) => p.categoryId === cat.publicId).length
  })

  return { users, categories, products, orders }
}

const initialData = buildInitialData()

export const initialCategories = initialData.categories
export const initialProducts = initialData.products.slice(0, 6)
export const initialUsers = initialData.users
export const initialOrders = initialData.orders.slice(0, 2)

class MemoryStore {
  constructor() {
    this.categories = [...initialData.categories]
    this.products = [...initialData.products]
    this.users = [...initialData.users]
    this.orders = [...initialData.orders]
    this.carts = new Map()
    this.favourites = new Map()
  }

  // Categories
  getCategories() {
    return this.categories
  }

  getCategoryByPublicId(publicId) {
    return this.categories.find((c) => c.publicId === publicId || c.id === publicId) || null
  }

  getCategoryBySlug(slug) {
    return this.categories.find((c) => c.slug === slug) || null
  }

  addCategory(input) {
    const id = publicId()
    const category = {
      id,
      publicId: id,
      internalId: this.categories.length + 1,
      name: input.name,
      slug: input.slug || slugify(input.name),
      description: input.description || '',
      color: input.color || 'blue',
      image: input.image || unsplashImages[0],
      sortOrder: this.categories.length + 1,
      productCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.categories.unshift(category)
    return category
  }

  updateCategory(publicId, patch) {
    const cat = this.getCategoryByPublicId(publicId)
    if (!cat) return null
    Object.assign(cat, patch, { updatedAt: new Date().toISOString() })
    return cat
  }

  deleteCategory(publicId) {
    const idx = this.categories.findIndex((c) => c.publicId === publicId || c.id === publicId)
    if (idx !== -1) {
      this.categories.splice(idx, 1)
      return true
    }
    return false
  }

  // Products
  getProducts(filters = {}) {
    let list = [...this.products]

    if (filters.categorySlug) {
      list = list.filter((p) => p.category?.slug === filters.categorySlug)
    }
    if (filters.categoryPublicId) {
      list = list.filter((p) => p.categoryId === filters.categoryPublicId)
    }
    if (filters.gender) {
      const genders = Array.isArray(filters.gender) ? filters.gender : [filters.gender]
      list = list.filter((p) => genders.includes(p.gender))
    }
    if (filters.minPrice) {
      list = list.filter((p) => p.price >= Number(filters.minPrice))
    }
    if (filters.maxPrice) {
      list = list.filter((p) => p.price <= Number(filters.maxPrice))
    }
    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      )
    }
    if (filters.featured) {
      list = list.filter((p) => p.featured)
    }
    if (filters.storefront) {
      list = list.filter((p) => p.status === 'active')
    }

    const total = list.length
    const offset = Number(filters.offset) || 0
    const limit = Number(filters.limit) || 20
    const items = list.slice(offset, offset + limit)

    return { items, total }
  }

  getProductByPublicId(publicId) {
    return this.products.find((p) => p.publicId === publicId || p.id === publicId) || null
  }

  getProductBySlug(slug) {
    return this.products.find((p) => p.slug === slug) || null
  }

  addProduct(input) {
    const id = publicId()
    const category = this.categories.find((c) => c.publicId === input.categoryId || c.id === input.categoryId)
    const product = {
      id,
      publicId: id,
      internalId: this.products.length + 1,
      name: input.name,
      slug: input.slug || slugify(input.name),
      sku: input.sku || `SKU-${Date.now()}`,
      price: Number(input.price) || 99.99,
      compareAtPrice: input.compareAtPrice ? Number(input.compareAtPrice) : null,
      costPerItem: input.costPerItem ? Number(input.costPerItem) : 45.0,
      brand: input.brand || 'Kick',
      gender: input.gender || 'unisex',
      material: input.material || 'Mesh',
      status: input.status || 'active',
      featured: Boolean(input.featured),
      inStock: true,
      totalStock: input.variants ? input.variants.reduce((s, v) => s + Number(v.stock || 0), 0) : 50,
      unitsSold: 0,
      rating: 5.0,
      reviewCount: 1,
      images: input.images && input.images.length ? input.images : [unsplashImages[0]],
      image: input.images && input.images[0] ? input.images[0] : unsplashImages[0],
      colorImages: input.colorImages || [],
      tags: input.tags || [],
      categoryId: category ? category.publicId : null,
      category: category ? { id: category.publicId, name: category.name, slug: category.slug } : null,
      colors: input.colors || ['Black'],
      sizes: input.sizes || ['40', '41', '42'],
      variants: input.variants || [],
      description: input.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.products.unshift(product)
    return product
  }

  updateProduct(publicId, patch) {
    const prod = this.getProductByPublicId(publicId)
    if (!prod) return null
    if (patch.categoryId) {
      const category = this.categories.find((c) => c.publicId === patch.categoryId || c.id === patch.categoryId)
      if (category) {
        prod.categoryId = category.publicId
        prod.category = { id: category.publicId, name: category.name, slug: category.slug }
      }
    }
    Object.assign(prod, patch, { updatedAt: new Date().toISOString() })
    if (patch.images !== undefined) prod.image = patch.images[0] ?? null
    return prod
  }

  deleteProduct(publicId) {
    const idx = this.products.findIndex((p) => p.publicId === publicId || p.id === publicId)
    if (idx !== -1) {
      this.products.splice(idx, 1)
      return true
    }
    return false
  }

  // Durable customer state fallback (used only when MySQL is unavailable).
  getCart(userId) {
    return [...(this.carts.get(String(userId))?.values() ?? [])]
  }

  setCartItem(userId, variantId, quantity) {
    const key = String(userId)
    const cart = this.carts.get(key) ?? new Map()
    cart.set(String(variantId), { variantId: String(variantId), quantity: Number(quantity) })
    this.carts.set(key, cart)
  }

  removeCartItem(userId, variantId) {
    this.carts.get(String(userId))?.delete(String(variantId))
  }

  clearCart(userId) {
    this.carts.delete(String(userId))
  }

  getFavourites(userId) {
    return [...(this.favourites.get(String(userId)) ?? new Set())]
  }

  addFavourite(userId, productId) {
    const key = String(userId)
    const favourites = this.favourites.get(key) ?? new Set()
    favourites.add(String(productId))
    this.favourites.set(key, favourites)
  }

  removeFavourite(userId, productId) {
    this.favourites.get(String(userId))?.delete(String(productId))
  }

  // Users
  getUsers() {
    return this.users
  }

  getUserByPublicId(publicId) {
    return this.users.find((u) => u.publicId === publicId || u.id === publicId) || null
  }

  getUserByEmail(email) {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null
  }

  addUser(input) {
    const id = publicId()
    const user = {
      id,
      publicId: id,
      internalId: this.users.length + 1,
      role: input.role || 'customer',
      firstName: input.firstName,
      lastName: input.lastName,
      fullName: `${input.firstName} ${input.lastName}`,
      email: input.email,
      passwordHash: input.passwordHash || bcrypt.hashSync('Password123', 10),
      phone: input.phone || '',
      status: 'active',
      emailVerified: true,
      address: input.address || null,
      preferredSize: input.preferredSize || '9',
      marketingOptIn: Boolean(input.marketingOptIn),
      notes: '',
      totalOrders: 0,
      totalSpent: 0,
      avgOrderValue: 0,
      returnCount: 0,
      lastOrderAt: null,
      tier: 'bronze',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.users.unshift(user)
    return user
  }

  // Orders
  getOrders() {
    return this.orders
  }

  getOrderById(publicId) {
    return this.orders.find((o) => o.publicId === publicId || o.id === publicId) || null
  }

  addOrder(input) {
    const num = 1000 + this.orders.length + 1
    const id = publicId()
    const order = {
      id,
      publicId: id,
      internalId: this.orders.length + 1,
      orderNumber: input.orderNumber || `#${num}`,
      status: input.status || 'pending',
      paymentStatus: input.paymentStatus || 'pending',
      customer: input.customer || {
        id: 'USR-CUST1',
        name: 'Guest Shopper',
        email: 'guest@example.com',
        phone: '+1 555-0100',
      },
      shippingAddress: input.shippingAddress || {
        line1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
      },
      items: input.items || [],
      subtotal: Number(input.subtotal) || 0,
      shippingCost: Number(input.shippingCost) || 0,
      tax: Number(input.tax) || 0,
      grandTotal: Number(input.grandTotal) || Number(input.subtotal) || 0,
      placedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.orders.unshift(order)
    return order
  }

  updateOrderStatus(publicId, status) {
    const order = this.getOrderById(publicId)
    if (!order) return null
    order.status = status
    order.updatedAt = new Date().toISOString()
    return order
  }

  // Dashboard Stats
  getDashboardStats() {
    const totalRevenue = this.orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0)
    const totalOrders = this.orders.length
    const totalCustomers = this.users.filter((u) => u.role === 'customer').length
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      revenueChange: 12.5,
      totalOrders,
      ordersChange: 8.3,
      orders30: totalOrders,
      totalCustomers,
      customersChange: 15.2,
      newCustomers30: totalCustomers,
      avgOrderValue: Number(avgOrderValue.toFixed(2)),
      aovChange: 4.1,
      pendingOrders: this.orders.filter((o) => o.status === 'pending').length,
      processingOrders: this.orders.filter((o) => o.status === 'processing').length,
      shippedOrders: this.orders.filter((o) => o.status === 'shipped').length,
      returnedOrders: this.orders.filter((o) => o.status === 'returned').length,
      totalProducts: this.products.length,
      activeProducts: this.products.filter((p) => p.status === 'active').length,
      unitsSold: this.products.reduce((s, p) => s + (p.unitsSold || 0), 100),
      monthlyRevenue: [
        { month: 'Jan', total: 12000 },
        { month: 'Feb', total: 15000 },
        { month: 'Mar', total: 18000 },
        { month: 'Apr', total: 14000 },
        { month: 'May', total: 22000 },
        { month: 'Jun', total: 25000 },
      ],
    }
  }
}

export const memoryStore = new MemoryStore()
