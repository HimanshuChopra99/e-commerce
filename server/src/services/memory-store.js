import bcrypt from 'bcryptjs'
import { slugify } from '../utils/helpers.js'

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

const sampleImages = unsplashImages

const CATEGORIES_DATA = [
  { name: 'Running', color: 'blue', image: unsplashImages[0], description: 'Road and trail shoes built for distance, speed and daily training.' },
  { name: 'Sneakers', color: 'teal', image: unsplashImages[1], description: 'Everyday low-tops, high-tops and lifestyle silhouettes.' },
  { name: 'Formal', color: 'slate', image: unsplashImages[6], description: 'Oxfords, derbies and loafers for the office and formal occasions.' },
  { name: 'Boots', color: 'amber', image: unsplashImages[14], description: 'Hiking, chelsea and weatherproof boots for rough ground.' },
  { name: 'Training', color: 'rose', image: unsplashImages[11], description: 'High-intensity gym, crossfit and weightlifting footwear.' },
  { name: 'Basketball', color: 'violet', image: unsplashImages[9], description: 'High-top ankle support and court responsive traction.' },
]

const USERS_DATA = [
  {
    role: 'admin',
    firstName: 'Store',
    lastName: 'Admin',
    email: 'admin@Kick.com',
    password: 'ChangeMe123!',
    phone: '+1 555-0199',
    preferredSize: '10',
    address: { line1: '100 Admin Plaza', city: 'San Francisco', state: 'CA', postalCode: '94105', country: 'USA' },
  },
  {
    role: 'customer',
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'customer@example.com',
    password: 'Password123',
    phone: '+1 555-0122',
    preferredSize: '8',
    address: { line1: '12 Marine Drive', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'India' },
  },
  {
    role: 'customer',
    firstName: 'Alex',
    lastName: 'Rivera',
    email: 'alex.rivera@example.com',
    password: 'Password123',
    phone: '+1 555-0144',
    preferredSize: '9',
    address: { line1: '742 Evergreen Terrace', city: 'Austin', state: 'TX', postalCode: '78701', country: 'USA' },
  },
  {
    role: 'customer',
    firstName: 'Jordan',
    lastName: 'Lee',
    email: 'jordan.lee@example.com',
    password: 'Password123',
    phone: '+1 555-0166',
    preferredSize: '10',
    address: { line1: '450 Kingsway', city: 'Vancouver', state: 'BC', postalCode: 'V5T 3J8', country: 'Canada' },
  },
  {
    role: 'customer',
    firstName: 'Samira',
    lastName: 'Patel',
    email: 'samira.patel@example.com',
    password: 'Password123',
    phone: '+1 555-0188',
    preferredSize: '7',
    address: { line1: '88 Baker Street', city: 'London', state: 'England', postalCode: 'NW1 6XE', country: 'UK' },
  },
  {
    role: 'customer',
    firstName: 'Marcus',
    lastName: 'Vance',
    email: 'marcus.vance@example.com',
    password: 'Password123',
    phone: '+1 555-0190',
    preferredSize: '11',
    address: { line1: '120 Collins Street', city: 'Melbourne', state: 'VIC', postalCode: '3000', country: 'Australia' },
  },
]

function generate100Products() {
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
      if (products.length >= 105) break

      const pName = `${prefixes[i]} ${suffixes[j]} ${count}`
      const category = categoryNames[count % categoryNames.length]
      const gender = genders[count % genders.length]
      const material = materials[count % materials.length]
      const colors = colorsList[count % colorsList.length]
      const price = Number((59.99 + (count * 3.7) % 220).toFixed(2))
      const compareAtPrice = count % 3 === 0 ? Number((price * 1.25).toFixed(2)) : null
      const img1 = unsplashImages[(count - 1) % unsplashImages.length]
      const img2 = unsplashImages[count % unsplashImages.length]

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
      })

      count++
    }
  }

  return products
}

function buildInitialData() {
  const users = USERS_DATA.map((u, idx) => ({
    id: `USR-${u.role === 'admin' ? 'ADMIN' : 'CUST' + idx}`,
    publicId: `USR-${u.role === 'admin' ? 'ADMIN' : 'CUST' + idx}`,
    internalId: idx + 1,
    role: u.role,
    firstName: u.firstName,
    lastName: u.lastName,
    fullName: `${u.firstName} ${u.lastName}`,
    email: u.email,
    passwordHash: bcrypt.hashSync(u.password, 10),
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

  const rawProducts = generate100Products()

  const categories = CATEGORIES_DATA.map((c, idx) => ({
    id: `CAT-${c.name.toUpperCase()}`,
    publicId: `CAT-${c.name.toUpperCase()}`,
    internalId: idx + 1,
    name: c.name,
    slug: slugify ? slugify(c.name) : c.name.toLowerCase(),
    description: c.description,
    color: c.color,
    image: c.image,
    sortOrder: idx + 1,
    productCount: Math.floor(rawProducts.length / CATEGORIES_DATA.length),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))

  const sizes = ['38', '39', '40', '41', '42', '43', '44', '45']
  const products = rawProducts.map((p, idx) => {
    const pId = `PROD-${String(idx + 1).padStart(3, '0')}`
    const cat = categories.find((c) => c.name === p.category) || categories[0]

    return {
      id: pId,
      publicId: pId,
      internalId: idx + 1,
      name: p.name,
      slug: slugify ? slugify(p.name) : p.name.toLowerCase().replace(/\s+/g, '-'),
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
      tags: p.tags,
      categoryId: cat.publicId,
      category: { id: cat.publicId, name: cat.name, slug: cat.slug },
      colors: p.colors,
      sizes,
      variants: p.colors.flatMap((col) =>
        sizes.map((sz, vIdx) => ({
          id: `VAR-${idx + 1}-${vIdx}`,
          publicId: `VAR-${idx + 1}-${vIdx}`,
          size: sz,
          color: col,
          stock: 10,
          reserved: 0,
          is_active: true,
        }))
      ),
      description: p.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  })

  const orders = Array.from({ length: 15 }).map((_, idx) => {
    const num = 1000 + idx + 1
    const user = users[1 + (idx % 5)]
    const product = products[(idx * 3) % products.length]
    const lineTotal = product.price

    return {
      id: `ORD-${num}`,
      publicId: `ORD-${num}`,
      internalId: idx + 1,
      orderNumber: `KICK-${num}`,
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
          id: `ITEM-${idx + 1}`,
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

  return { users, categories, products, orders }
}

export const initialCategories = [
  {
    id: 'CAT-RUNNING',
    publicId: 'CAT-RUNNING',
    internalId: 1,
    name: 'Running',
    slug: 'running',
    description: 'Road and trail shoes built for distance, speed and daily training.',
    color: 'blue',
    image: sampleImages[0],
    sortOrder: 1,
    productCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'CAT-SNEAKERS',
    publicId: 'CAT-SNEAKERS',
    internalId: 2,
    name: 'Sneakers',
    slug: 'sneakers',
    description: 'Everyday low-tops, high-tops and lifestyle silhouettes.',
    color: 'teal',
    image: sampleImages[1],
    sortOrder: 2,
    productCount: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'CAT-FORMAL',
    publicId: 'CAT-FORMAL',
    internalId: 3,
    name: 'Formal',
    slug: 'formal',
    description: 'Oxfords, derbies and loafers for the office and occasions.',
    color: 'slate',
    image: sampleImages[2],
    sortOrder: 3,
    productCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'CAT-BOOTS',
    publicId: 'CAT-BOOTS',
    internalId: 4,
    name: 'Boots',
    slug: 'boots',
    description: 'Hiking, chelsea and weatherproof boots for rough ground.',
    color: 'amber',
    image: sampleImages[3],
    sortOrder: 4,
    productCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const initialProducts = [
  {
    id: 'PROD-001',
    publicId: 'PROD-001',
    internalId: 1,
    name: 'Aero Runner 2.0',
    slug: 'aero-runner-2-0',
    sku: 'SS-RUN-0001',
    price: 129.99,
    compareAtPrice: 159.99,
    costPerItem: 65.0,
    brand: 'Kick',
    gender: 'unisex',
    material: 'Mesh',
    status: 'active',
    featured: true,
    inStock: true,
    totalStock: 85,
    unitsSold: 240,
    rating: 4.8,
    reviewCount: 124,
    images: [sampleImages[0], sampleImages[1]],
    image: sampleImages[0],
    tags: ['running', 'lightweight', 'daily-trainer'],
    categoryId: 'CAT-RUNNING',
    category: { id: 'CAT-RUNNING', name: 'Running', slug: 'running' },
    colors: ['Black', 'Blue'],
    sizes: ['38', '39', '40', '41', '42', '43', '44', '45'],
    variants: [
      { id: 'VAR-101', publicId: 'VAR-101', size: '40', color: 'Black', stock: 15, reserved: 0, is_active: true },
      { id: 'VAR-102', publicId: 'VAR-102', size: '41', color: 'Black', stock: 20, reserved: 0, is_active: true },
      { id: 'VAR-103', publicId: 'VAR-103', size: '42', color: 'Blue', stock: 25, reserved: 0, is_active: true },
      { id: 'VAR-104', publicId: 'VAR-104', size: '43', color: 'Blue', stock: 25, reserved: 0, is_active: true },
    ],
    description: 'A featherweight daily trainer built for long miles. Engineered mesh upper breathes on hot runs.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PROD-002',
    publicId: 'PROD-002',
    internalId: 2,
    name: 'Velocity Pro Racer',
    slug: 'velocity-pro-racer',
    sku: 'SS-RUN-0002',
    price: 179.99,
    compareAtPrice: 199.99,
    costPerItem: 85.0,
    brand: 'Kick',
    gender: 'men',
    material: 'Knit',
    status: 'active',
    featured: true,
    inStock: true,
    totalStock: 60,
    unitsSold: 180,
    rating: 4.9,
    reviewCount: 89,
    images: [sampleImages[1], sampleImages[2]],
    image: sampleImages[1],
    tags: ['running', 'race-day', 'performance'],
    categoryId: 'CAT-RUNNING',
    category: { id: 'CAT-RUNNING', name: 'Running', slug: 'running' },
    colors: ['Red', 'Black'],
    sizes: ['39', '40', '41', '42', '43', '44'],
    variants: [
      { id: 'VAR-201', publicId: 'VAR-201', size: '41', color: 'Red', stock: 30, reserved: 0, is_active: true },
      { id: 'VAR-202', publicId: 'VAR-202', size: '42', color: 'Black', stock: 30, reserved: 0, is_active: true },
    ],
    description: 'Our fastest silhouette yet. Carbon-infused plate and race-day foam.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PROD-003',
    publicId: 'PROD-003',
    internalId: 3,
    name: 'Metro Classic Low',
    slug: 'metro-classic-low',
    sku: 'SS-SNE-0003',
    price: 89.99,
    compareAtPrice: null,
    costPerItem: 40.0,
    brand: 'Kick',
    gender: 'unisex',
    material: 'Canvas',
    status: 'active',
    featured: false,
    inStock: true,
    totalStock: 120,
    unitsSold: 310,
    rating: 4.6,
    reviewCount: 205,
    images: [sampleImages[2]],
    image: sampleImages[2],
    tags: ['sneakers', 'casual', 'everyday'],
    categoryId: 'CAT-SNEAKERS',
    category: { id: 'CAT-SNEAKERS', name: 'Sneakers', slug: 'sneakers' },
    colors: ['White', 'Black'],
    sizes: ['38', '39', '40', '41', '42', '43'],
    variants: [
      { id: 'VAR-301', publicId: 'VAR-301', size: '40', color: 'White', stock: 60, reserved: 0, is_active: true },
      { id: 'VAR-302', publicId: 'VAR-302', size: '41', color: 'Black', stock: 60, reserved: 0, is_active: true },
    ],
    description: 'Everyday low-top that pairs with everything. Vulcanised rubber sole and padded insole.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PROD-004',
    publicId: 'PROD-004',
    internalId: 4,
    name: 'Street Court Hi',
    slug: 'street-court-hi',
    sku: 'SS-SNE-0004',
    price: 109.99,
    compareAtPrice: 129.99,
    costPerItem: 52.0,
    brand: 'Kick',
    gender: 'unisex',
    material: 'Leather',
    status: 'active',
    featured: true,
    inStock: true,
    totalStock: 45,
    unitsSold: 140,
    rating: 4.7,
    reviewCount: 94,
    images: [sampleImages[3]],
    image: sampleImages[3],
    tags: ['sneakers', 'high-top', 'leather'],
    categoryId: 'CAT-SNEAKERS',
    category: { id: 'CAT-SNEAKERS', name: 'Sneakers', slug: 'sneakers' },
    colors: ['White', 'Green'],
    sizes: ['40', '41', '42', '43', '44'],
    variants: [
      { id: 'VAR-401', publicId: 'VAR-401', size: '42', color: 'White', stock: 25, reserved: 0, is_active: true },
      { id: 'VAR-402', publicId: 'VAR-402', size: '43', color: 'Green', stock: 20, reserved: 0, is_active: true },
    ],
    description: 'A high-top court classic rebuilt in premium leather. Padded collar, heritage outline.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PROD-005',
    publicId: 'PROD-005',
    internalId: 5,
    name: 'Executive Oxford',
    slug: 'executive-oxford',
    sku: 'SS-FOR-0005',
    price: 189.99,
    compareAtPrice: null,
    costPerItem: 90.0,
    brand: 'Kick',
    gender: 'men',
    material: 'Genuine Leather',
    status: 'active',
    featured: false,
    inStock: true,
    totalStock: 30,
    unitsSold: 75,
    rating: 4.9,
    reviewCount: 42,
    images: [sampleImages[4]],
    image: sampleImages[4],
    tags: ['formal', 'office', 'leather'],
    categoryId: 'CAT-FORMAL',
    category: { id: 'CAT-FORMAL', name: 'Formal', slug: 'formal' },
    colors: ['Black', 'Brown'],
    sizes: ['40', '41', '42', '43', '44'],
    variants: [
      { id: 'VAR-501', publicId: 'VAR-501', size: '41', color: 'Black', stock: 15, reserved: 0, is_active: true },
      { id: 'VAR-502', publicId: 'VAR-502', size: '42', color: 'Brown', stock: 15, reserved: 0, is_active: true },
    ],
    description: 'Hand-finished Oxford in full-grain leather with Goodyear welted sole.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'PROD-006',
    publicId: 'PROD-006',
    internalId: 6,
    name: 'Summit Trail Boot',
    slug: 'summit-trail-boot',
    sku: 'SS-BOO-0007',
    price: 219.99,
    compareAtPrice: null,
    costPerItem: 110.0,
    brand: 'Kick',
    gender: 'unisex',
    material: 'Nubuck',
    status: 'active',
    featured: true,
    inStock: true,
    totalStock: 25,
    unitsSold: 65,
    rating: 4.8,
    reviewCount: 38,
    images: [sampleImages[5]],
    image: sampleImages[5],
    tags: ['boots', 'hiking', 'waterproof'],
    categoryId: 'CAT-BOOTS',
    category: { id: 'CAT-BOOTS', name: 'Boots', slug: 'boots' },
    colors: ['Brown', 'Green'],
    sizes: ['40', '41', '42', '43', '44', '45'],
    variants: [
      { id: 'VAR-601', publicId: 'VAR-601', size: '42', color: 'Brown', stock: 15, reserved: 0, is_active: true },
      { id: 'VAR-602', publicId: 'VAR-602', size: '43', color: 'Green', stock: 10, reserved: 0, is_active: true },
    ],
    description: 'Waterproof hiking boot with grippy lugged outsole and nubuck upper.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const initialUsers = [
  {
    id: 'USR-ADMIN',
    publicId: 'USR-ADMIN',
    internalId: 1,
    role: 'admin',
    firstName: 'Store',
    lastName: 'Admin',
    fullName: 'Store Admin',
    email: 'admin@Kick.com',
    passwordHash: bcrypt.hashSync('ChangeMe123!', 10),
    phone: '+1 555-0199',
    status: 'active',
    emailVerified: true,
    address: {
      line1: '100 Admin Plaza',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94105',
      country: 'USA',
    },
    preferredSize: '10',
    marketingOptIn: true,
    notes: 'System administrator',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'USR-CUST1',
    publicId: 'USR-CUST1',
    internalId: 2,
    role: 'customer',
    firstName: 'Priya',
    lastName: 'Sharma',
    fullName: 'Priya Sharma',
    email: 'customer@example.com',
    passwordHash: bcrypt.hashSync('Password123', 10),
    phone: '+1 555-0122',
    status: 'active',
    emailVerified: true,
    address: {
      line1: '12 Marine Drive',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    },
    preferredSize: '8',
    marketingOptIn: true,
    notes: 'VIP Customer',
    totalOrders: 5,
    totalSpent: 890.5,
    avgOrderValue: 178.1,
    returnCount: 0,
    lastOrderAt: new Date().toISOString(),
    tier: 'silver',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export const initialOrders = [
  {
    id: 'ORD-1001',
    publicId: 'ORD-1001',
    internalId: 1,
    orderNumber: 'KICK-1001',
    status: 'processing',
    paymentStatus: 'paid',
    customer: {
      id: 'USR-CUST1',
      name: 'Priya Sharma',
      email: 'customer@example.com',
      phone: '+1 555-0122',
    },
    shippingAddress: {
      line1: '12 Marine Drive',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    },
    items: [
      {
        id: 'ITEM-1',
        productPublicId: 'PROD-001',
        productName: 'Aero Runner 2.0',
        productSlug: 'aero-runner-2-0',
        productImage: sampleImages[0],
        color: 'Black',
        size: '41',
        unitPrice: 129.99,
        quantity: 1,
        lineTotal: 129.99,
      },
    ],
    subtotal: 129.99,
    shippingCost: 0,
    tax: 10.4,
    grandTotal: 140.39,
    placedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ORD-1002',
    publicId: 'ORD-1002',
    internalId: 2,
    orderNumber: 'KICK-1002',
    status: 'shipped',
    paymentStatus: 'paid',
    customer: {
      id: 'USR-CUST1',
      name: 'Priya Sharma',
      email: 'customer@example.com',
      phone: '+1 555-0122',
    },
    shippingAddress: {
      line1: '12 Marine Drive',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    },
    items: [
      {
        id: 'ITEM-2',
        productPublicId: 'PROD-002',
        productName: 'Velocity Pro Racer',
        productSlug: 'velocity-pro-racer',
        productImage: sampleImages[1],
        color: 'Red',
        size: '41',
        unitPrice: 179.99,
        quantity: 1,
        lineTotal: 179.99,
      },
    ],
    subtotal: 179.99,
    shippingCost: 0,
    tax: 14.4,
    grandTotal: 194.39,
    placedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

class MemoryStore {
  constructor() {
    const generated = buildInitialData()
    this.categories = generated.categories
    this.products = generated.products
    this.users = generated.users
    this.orders = generated.orders
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
    const id = `CAT-${Date.now().toString(36).toUpperCase()}`
    const category = {
      id,
      publicId: id,
      internalId: this.categories.length + 1,
      name: input.name,
      slug: input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: input.description || '',
      color: input.color || 'blue',
      image: input.image || sampleImages[0],
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
    const id = `PROD-${Date.now().toString(36).toUpperCase()}`
    const category = this.categories.find((c) => c.publicId === input.categoryId || c.id === input.categoryId)
    const product = {
      id,
      publicId: id,
      internalId: this.products.length + 1,
      name: input.name,
      slug: input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
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
      images: input.images && input.images.length ? input.images : [sampleImages[0]],
      image: input.images && input.images[0] ? input.images[0] : sampleImages[0],
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
    const id = `USR-${Date.now().toString(36).toUpperCase()}`
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
    const id = `ORD-${num}`
    const order = {
      id,
      publicId: id,
      internalId: this.orders.length + 1,
      orderNumber: `KICK-${num}`,
      status: 'pending',
      paymentStatus: 'paid',
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
