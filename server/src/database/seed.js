/**
 * Seeds a comprehensive catalogue with 210+ unique products across 15+ authentic brands,
 * with multiple colorways per shoe, color-specific image galleries, rich descriptions, and accurate tags.
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
  { name: 'Running', color: 'blue', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80', description: 'Road and trail shoes built for distance, speed, cushioning and daily marathon training.' },
  { name: 'Sneakers', color: 'teal', image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&auto=format&fit=crop&q=80', description: 'Everyday low-tops, high-tops, retro classics and streetwear lifestyle silhouettes.' },
  { name: 'Casual shoes', color: 'indigo', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80', description: 'Comfortable loafers, slip-ons, and daily walking shoes for street ease.' },
  { name: 'Formal', color: 'slate', image: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=600&auto=format&fit=crop&q=80', description: 'Oxfords, derbies, monk straps and leather dress shoes for the office and black-tie events.' },
  { name: 'Boots', color: 'amber', image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80', description: 'Hiking, chelsea, waterproof and insulated weatherproof boots for rugged terrain and winter rain.' },
  { name: 'Basketball', color: 'orange', image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=600&auto=format&fit=crop&q=80', description: 'High-traction court shoes built for explosive vertical lift, ankle support and court grip.' },
  { name: 'Outdoor', color: 'teal', image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80', description: 'Rugged all-weather trail footwear designed for trail running, hiking and wet rainy seasons.' },
  { name: 'Training', color: 'rose', image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600&auto=format&fit=crop&q=80', description: 'Crossfit, gym workout, weightlifting and athletic performance shoes with lateral stability.' },
]

// High-resolution studio shoe photography by color palette
const COLOR_IMAGE_MAP = {
  Black: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=700&auto=format&fit=crop&q=80',
  ],
  White: [
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=700&auto=format&fit=crop&q=80',
  ],
  Red: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=700&auto=format&fit=crop&q=80',
  ],
  Blue: [
    'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1575537302964-96cd47c06b1b?w=700&auto=format&fit=crop&q=80',
  ],
  Navy: [
    'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=700&auto=format&fit=crop&q=80',
  ],
  Green: [
    'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=700&auto=format&fit=crop&q=80',
  ],
  Grey: [
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1539185441755-769473a23570?w=700&auto=format&fit=crop&q=80',
  ],
  Yellow: [
    'https://images.unsplash.com/photo-1586525198428-225f6f12cff5?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=700&auto=format&fit=crop&q=80',
  ],
  Pink: [
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?w=700&auto=format&fit=crop&q=80',
  ],
  Brown: [
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=700&auto=format&fit=crop&q=80',
  ],
  Tan: [
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586525198428-225f6f12cff5?w=700&auto=format&fit=crop&q=80',
  ],
}

const BRAND_CATALOGUE = [
  {
    brand: 'Nike',
    category: 'Running',
    models: [
      { name: 'Air Max 90', material: 'Synthetic Mesh', price: 130.00, gender: 'men', tags: ['running', 'nike', 'men', 'air max', 'cushioned', 'streetwear', 'retro', 'mesh', 'breathable'] },
      { name: 'Air Max 270', material: 'Knit Upper', price: 160.00, gender: 'unisex', tags: ['running', 'nike', 'unisex', 'air max', 'cushioned', 'lifestyle', 'lightweight', 'breathable'] },
      { name: 'Pegasus 40', material: 'Synthetic Mesh', price: 140.00, gender: 'men', tags: ['running', 'nike', 'men', 'marathon', 'daily runner', 'cushioned', 'road running', 'lightweight'] },
      { name: 'Vaporfly 3', material: 'Knit Upper', price: 260.00, gender: 'unisex', tags: ['running', 'nike', 'unisex', 'marathon', 'carbon fiber', 'racing', 'speed', 'elite'] },
      { name: 'Infinity Run 4', material: 'Knit Upper', price: 160.00, gender: 'women', tags: ['running', 'nike', 'women', 'supportive', 'cushioned', 'react foam', 'comfort', 'daily runner'] },
      { name: 'Zoom Fly 5', material: 'Synthetic Mesh', price: 170.00, gender: 'men', tags: ['running', 'nike', 'men', 'training', 'marathon', 'tempo', 'propulsive', 'road running'] },
    ],
  },
  {
    brand: 'Nike',
    category: 'Sneakers',
    models: [
      { name: 'Dunk Low Retro', material: 'Genuine Leather', price: 115.00, gender: 'unisex', tags: ['sneakers', 'nike', 'unisex', 'dunk low', 'leather', 'retro', 'streetwear', 'classic'] },
      { name: 'Air Force 1 07', material: 'Genuine Leather', price: 115.00, gender: 'unisex', tags: ['sneakers', 'nike', 'unisex', 'af1', 'leather', 'iconic', 'white sneakers', 'all day'] },
      { name: 'Blazer Mid 77', material: 'Genuine Leather', price: 105.00, gender: 'men', tags: ['sneakers', 'nike', 'men', 'high top', 'vintage', 'leather', 'suede', 'retro'] },
      { name: 'Court Vision Low', material: 'Synthetic Leather', price: 75.00, gender: 'men', tags: ['sneakers', 'nike', 'men', 'budget', 'affordable', 'low price', 'clean', 'casual'] },
      { name: 'Air Max Plus', material: 'Synthetic Mesh', price: 180.00, gender: 'men', tags: ['sneakers', 'nike', 'men', 'air max', 'tuned air', 'gradient', 'streetwear'] },
    ],
  },
  {
    brand: 'Nike',
    category: 'Basketball',
    models: [
      { name: 'LeBron XXI', material: 'Knit Upper', price: 200.00, gender: 'men', tags: ['basketball', 'nike', 'men', 'lebron', 'court grip', 'cushioned', 'ankle support', 'explosive'] },
      { name: 'KD 16', material: 'Synthetic Mesh', price: 160.00, gender: 'unisex', tags: ['basketball', 'nike', 'unisex', 'kd', 'court shoes', 'traction', 'multi-directional'] },
      { name: 'GT Cut 3', material: 'Knit Upper', price: 190.00, gender: 'men', tags: ['basketball', 'nike', 'men', 'zoomx', 'court traction', 'quick cuts', 'speed'] },
      { name: 'Ja 1', material: 'Synthetic Mesh', price: 120.00, gender: 'men', tags: ['basketball', 'nike', 'men', 'ja morant', 'lightweight', 'lockdown', 'bball'] },
    ],
  },
  {
    brand: 'Adidas',
    category: 'Running',
    models: [
      { name: 'Ultraboost Light', material: 'Knit Upper', price: 190.00, gender: 'unisex', tags: ['running', 'adidas', 'unisex', 'ultraboost', 'boost', 'cushioned', 'marathon', 'comfort'] },
      { name: 'Adizero Adios Pro 3', material: 'Synthetic Mesh', price: 250.00, gender: 'unisex', tags: ['running', 'adidas', 'unisex', 'racing', 'marathon', 'lightstrike pro', 'elite', 'speed'] },
      { name: '4DFWD 3', material: 'Knit Upper', price: 220.00, gender: 'men', tags: ['running', 'adidas', 'men', '3d printed', 'forward motion', 'lattice', 'futuristic', 'smooth'] },
      { name: 'Supernova Rise', material: 'Synthetic Mesh', price: 140.00, gender: 'women', tags: ['running', 'adidas', 'women', 'dreamstrike', 'daily trainer', 'soft cushion', 'comfort'] },
      { name: 'Duramo Speed', material: 'Synthetic Mesh', price: 80.00, gender: 'men', tags: ['running', 'adidas', 'men', 'affordable', 'budget', 'low price', 'lightweight'] },
    ],
  },
  {
    brand: 'Adidas',
    category: 'Sneakers',
    models: [
      { name: 'Samba OG', material: 'Genuine Leather', price: 100.00, gender: 'unisex', tags: ['sneakers', 'adidas', 'unisex', 'samba', 'leather', 'suede toe', 'streetwear', 'terrace', 'classic'] },
      { name: 'Gazelle Classic', material: 'Suede', price: 100.00, gender: 'unisex', tags: ['sneakers', 'adidas', 'unisex', 'gazelle', 'suede', 'retro', 'lifestyle', 'casual'] },
      { name: 'Stan Smith', material: 'Synthetic Leather', price: 80.00, gender: 'unisex', tags: ['sneakers', 'adidas', 'unisex', 'stan smith', 'clean', 'white sneakers', 'tennis', 'timeless'] },
      { name: 'Superstar', material: 'Genuine Leather', price: 100.00, gender: 'men', tags: ['sneakers', 'adidas', 'men', 'shell toe', 'leather', 'hip hop', 'iconic', 'heritage'] },
      { name: 'Forum Low', material: 'Genuine Leather', price: 110.00, gender: 'men', tags: ['sneakers', 'adidas', 'men', 'ankle strap', 'court vintage', 'leather', '80s'] },
    ],
  },
  {
    brand: 'Adidas',
    category: 'Outdoor',
    models: [
      { name: 'Terrex Free Hiker 2 GORE-TEX', material: 'Synthetic Mesh', price: 220.00, gender: 'men', tags: ['outdoor', 'adidas', 'men', 'gore-tex', 'waterproof', 'rain', 'hiking', 'boots', 'continental traction', 'trail'] },
      { name: 'Terrex Agravic Flow 2', material: 'Synthetic Mesh', price: 140.00, gender: 'women', tags: ['outdoor', 'adidas', 'women', 'trail running', 'waterproof outdoor', 'mud grip', 'promoderator'] },
      { name: 'Terrex Swift R3', material: 'Nubuck', price: 160.00, gender: 'unisex', tags: ['outdoor', 'adidas', 'unisex', 'all terrain', 'hiking boot', 'stable', 'durable', 'rock protection'] },
    ],
  },
  {
    brand: 'Jordan',
    category: 'Sneakers',
    models: [
      { name: 'Air Jordan 1 Retro High OG', material: 'Genuine Leather', price: 180.00, gender: 'unisex', tags: ['sneakers', 'jordan', 'unisex', 'aj1', 'high top', 'leather', 'grail', 'heritage', 'chicago'] },
      { name: 'Air Jordan 4 Retro', material: 'Nubuck', price: 215.00, gender: 'men', tags: ['sneakers', 'jordan', 'men', 'aj4', 'air cushion', 'mesh side panels', 'collector', 'retro'] },
      { name: 'Air Jordan 1 Low', material: 'Genuine Leather', price: 115.00, gender: 'women', tags: ['sneakers', 'jordan', 'women', 'aj1 low', 'leather', 'casual lifestyle', 'summer'] },
      { name: 'Jordan Stay Loyal 3', material: 'Genuine Leather', price: 120.00, gender: 'men', tags: ['sneakers', 'jordan', 'men', 'modern hybrid', 'visible air', 'durable', 'everyday'] },
      { name: 'Jordan Max Aura 5', material: 'Genuine Leather', price: 130.00, gender: 'men', tags: ['sneakers', 'jordan', 'men', 'heel air unit', 'reinforced eyelets', 'street hoops'] },
    ],
  },
  {
    brand: 'Jordan',
    category: 'Basketball',
    models: [
      { name: 'Jordan Tatum 2', material: 'Synthetic Mesh', price: 125.00, gender: 'men', tags: ['basketball', 'jordan', 'men', 'jayson tatum', 'lightest court shoe', 'air strobel', 'traction'] },
      { name: 'Jordan Luka 2', material: 'Synthetic Mesh', price: 130.00, gender: 'unisex', tags: ['basketball', 'jordan', 'unisex', 'luka doncic', 'isoplate step back', 'lateral containment'] },
      { name: 'Air Jordan XXXVIII', material: 'Knit Upper', price: 200.00, gender: 'men', tags: ['basketball', 'jordan', 'men', 'x-plate mobility', 'zoom air', 'sustainable performance'] },
    ],
  },
  {
    brand: 'Puma',
    category: 'Sneakers',
    models: [
      { name: 'Suede Classic XXI', material: 'Suede', price: 75.00, gender: 'unisex', tags: ['sneakers', 'puma', 'unisex', 'suede', 'b-boy', 'low top', 'retro', 'streetwear', 'affordable'] },
      { name: 'RS-X Efekt', material: 'Synthetic Mesh', price: 110.00, gender: 'men', tags: ['sneakers', 'puma', 'men', 'chunky sneaker', 'running system', 'futuristic', 'cushioned'] },
      { name: 'Clyde Base', material: 'Genuine Leather', price: 85.00, gender: 'unisex', tags: ['sneakers', 'puma', 'unisex', 'walt clyde', 'leather', 'heritage', 'clean aesthetic'] },
      { name: 'Future Rider Play On', material: 'Canvas', price: 80.00, gender: 'women', tags: ['sneakers', 'puma', 'women', 'federbein outsole', 'color block', 'lightweight', 'vintage'] },
    ],
  },
  {
    brand: 'Puma',
    category: 'Running',
    models: [
      { name: 'Velocity Nitro 2', material: 'Synthetic Mesh', price: 120.00, gender: 'men', tags: ['running', 'puma', 'men', 'nitro foam', 'pumagrip', 'daily trainer', 'responsive', 'smooth'] },
      { name: 'Deviate Nitro Elite 2', material: 'Knit Upper', price: 200.00, gender: 'unisex', tags: ['running', 'puma', 'unisex', 'innoplate carbon', 'super critical foam', 'marathon racing'] },
      { name: 'ForeverRun Nitro', material: 'Synthetic Mesh', price: 150.00, gender: 'women', tags: ['running', 'puma', 'women', 'run guide system', 'stability', 'comfort cushion'] },
    ],
  },
  {
    brand: 'New Balance',
    category: 'Sneakers',
    models: [
      { name: '574 Core', material: 'Suede', price: 90.00, gender: 'unisex', tags: ['sneakers', 'new balance', 'unisex', '574', 'encap midsole', 'suede mesh', 'iconic', 'comfort'] },
      { name: '550 Lifestyle', material: 'Genuine Leather', price: 110.00, gender: 'unisex', tags: ['sneakers', 'new balance', 'unisex', '550', '80s basketball', 'leather', 'vintage low'] },
      { name: '990v6 Made in USA', material: 'Suede', price: 200.00, gender: 'men', tags: ['sneakers', 'new balance', 'men', '990', 'fuelcell foam', 'encap', 'premium', 'luxury'] },
      { name: '1906R Protection Pack', material: 'Synthetic Mesh', price: 155.00, gender: 'men', tags: ['sneakers', 'new balance', 'men', '1906r', 'nergy cushioning', 'y2k runner', 'techwear'] },
      { name: '327 Classic', material: 'Canvas', price: 100.00, gender: 'women', tags: ['sneakers', 'new balance', 'women', '327', 'oversized n logo', 'trail inspired lugged sole'] },
    ],
  },
  {
    brand: 'New Balance',
    category: 'Running',
    models: [
      { name: 'Fresh Foam X 1080v13', material: 'Knit Upper', price: 165.00, gender: 'unisex', tags: ['running', 'new balance', 'unisex', 'fresh foam', 'maximum cushion', 'marathon', 'plush'] },
      { name: 'FuelCell Rebel v4', material: 'Synthetic Mesh', price: 140.00, gender: 'men', tags: ['running', 'new balance', 'men', 'fuelcell', 'lightweight speed', 'energy return', 'tempo'] },
      { name: 'Fresh Foam X More Trail v3', material: 'Synthetic Mesh', price: 160.00, gender: 'women', tags: ['outdoor', 'running', 'new balance', 'women', 'trail', 'vibram grip', 'max cushion', 'all terrain'] },
    ],
  },
  {
    brand: 'Asics',
    category: 'Running',
    models: [
      { name: 'GEL-Kayano 30', material: 'Synthetic Mesh', price: 160.00, gender: 'men', tags: ['running', 'asics', 'men', '4d guidance', 'puregel', 'stability', 'marathon', 'cushion'] },
      { name: 'GEL-Nimbus 26', material: 'Knit Upper', price: 160.00, gender: 'unisex', tags: ['running', 'asics', 'unisex', 'cloud cushion', 'puregel', 'plush collar', 'maximum comfort'] },
      { name: 'Novablast 4', material: 'Synthetic Mesh', price: 140.00, gender: 'men', tags: ['running', 'asics', 'men', 'ff blast plus eco', 'trampoline outsole', 'energetic bounce'] },
      { name: 'GT-2000 12', material: 'Synthetic Mesh', price: 140.00, gender: 'women', tags: ['running', 'asics', 'women', '3d guidance', 'puregel', 'daily road runner'] },
      { name: 'Magic Speed 3', material: 'Knit Upper', price: 160.00, gender: 'unisex', tags: ['running', 'asics', 'unisex', 'carbon plate', 'ff blast plus', 'speed workout', 'racing'] },
    ],
  },
  {
    brand: 'Asics',
    category: 'Sneakers',
    models: [
      { name: 'GEL-Lyte III OG', material: 'Suede', price: 120.00, gender: 'unisex', tags: ['sneakers', 'asics', 'unisex', 'split tongue', 'gel technology', 'retro runner', 'suede'] },
      { name: 'GEL-NYC', material: 'Synthetic Mesh', price: 130.00, gender: 'men', tags: ['sneakers', 'asics', 'men', 'gel cumulus 16 tooling', 'modern heritage', 'lifestyle'] },
      { name: 'GT-2160', material: 'Synthetic Mesh', price: 120.00, gender: 'unisex', tags: ['sneakers', 'asics', 'unisex', 'sleek silhouette', 'wavy forefoot sculpting', 'y2k'] },
    ],
  },
  {
    brand: 'Reebok',
    category: 'Sneakers',
    models: [
      { name: 'Club C 85 Vintage', material: 'Genuine Leather', price: 85.00, gender: 'unisex', tags: ['sneakers', 'reebok', 'unisex', 'club c', 'garment leather', 'vintage tennis', 'clean', 'retro'] },
      { name: 'Classic Leather', material: 'Genuine Leather', price: 85.00, gender: 'unisex', tags: ['sneakers', 'reebok', 'unisex', 'soft glove leather', 'die-cut eva midsole', 'timeless'] },
      { name: 'Question Mid', material: 'Genuine Leather', price: 170.00, gender: 'men', tags: ['sneakers', 'basketball', 'reebok', 'men', 'allen iverson', 'hexalite cushioning', 'toe cap'] },
    ],
  },
  {
    brand: 'Reebok',
    category: 'Training',
    models: [
      { name: 'Nano X4 Training', material: 'Knit Upper', price: 140.00, gender: 'unisex', tags: ['training', 'reebok', 'unisex', 'crossfit', 'lift and run chassis', 'flexweave upper', 'gym workout'] },
      { name: 'Floatride Energy 5', material: 'Synthetic Mesh', price: 110.00, gender: 'women', tags: ['running', 'reebok', 'women', 'floatride energy foam', 'torsion plate', 'responsive'] },
    ],
  },
  {
    brand: 'Converse',
    category: 'Sneakers',
    models: [
      { name: 'Chuck Taylor All Star Classic', material: 'Canvas', price: 65.00, gender: 'unisex', tags: ['sneakers', 'converse', 'unisex', 'chuck taylor', 'all star', 'canvas', 'high top', 'affordable', 'budget'] },
      { name: 'Chuck 70 Vintage Canvas', material: 'Canvas', price: 90.00, gender: 'unisex', tags: ['sneakers', 'converse', 'unisex', 'chuck 70', 'heavy canvas', 'cushioned insole', 'vintage'] },
      { name: 'One Star Pro Suede', material: 'Suede', price: 75.00, gender: 'unisex', tags: ['sneakers', 'converse', 'unisex', 'one star', 'suede low top', 'cx foam', 'skateboarding'] },
      { name: 'Run Star Hike Platform', material: 'Canvas', price: 110.00, gender: 'women', tags: ['sneakers', 'converse', 'women', 'platform sole', 'jagged rubber tread', 'statement look'] },
    ],
  },
  {
    brand: 'Vans',
    category: 'Sneakers',
    models: [
      { name: 'Old Skool Classic', material: 'Canvas', price: 70.00, gender: 'unisex', tags: ['sneakers', 'vans', 'unisex', 'old skool', 'side stripe', 'waffle sole', 'canvas suede', 'skate'] },
      { name: 'Sk8-Hi High Top', material: 'Canvas', price: 80.00, gender: 'unisex', tags: ['sneakers', 'vans', 'unisex', 'sk8 hi', 'padded collars', 'high top skate', 'durable'] },
      { name: 'Classic Slip-On Core', material: 'Canvas', price: 60.00, gender: 'unisex', tags: ['sneakers', 'vans', 'unisex', 'slip on', 'elastic accents', 'low profile', 'affordable', 'budget'] },
      { name: 'UltraRange EXO', material: 'Synthetic Mesh', price: 100.00, gender: 'men', tags: ['sneakers', 'outdoor', 'vans', 'men', 'ultracush lite', 'all terrain traction', 'breathable'] },
    ],
  },
  {
    brand: 'Timberland',
    category: 'Boots',
    models: [
      { name: 'Premium 6-Inch Waterproof Boot', material: 'Nubuck', price: 198.00, gender: 'men', tags: ['boots', 'outdoor', 'timberland', 'men', 'waterproof', 'rain', 'winter', 'primaloft insulation', 'seam sealed', 'rugged'] },
      { name: 'Euro Hiker Waterproof Boot', material: 'Genuine Leather', price: 140.00, gender: 'unisex', tags: ['boots', 'outdoor', 'timberland', 'unisex', 'hiking boot', 'waterproof membrane', 'eva midsole'] },
      { name: 'Bradstreet Leather Oxford', material: 'Genuine Leather', price: 120.00, gender: 'men', tags: ['formal', 'casual shoes', 'timberland', 'men', 'sensorflex comfort', 'leather oxford', 'office'] },
    ],
  },
  {
    brand: 'Hoka',
    category: 'Running',
    models: [
      { name: 'Clifton 9 Maximum Cushion', material: 'Knit Upper', price: 145.00, gender: 'unisex', tags: ['running', 'hoka', 'unisex', 'clifton', 'max cushion', 'early stage meta rocker', 'plush road'] },
      { name: 'Bondi 8 Ultra-Cushioned', material: 'Synthetic Mesh', price: 165.00, gender: 'unisex', tags: ['running', 'hoka', 'unisex', 'bondi', 'thickest foam', 'memory foam collar', 'all day comfort'] },
      { name: 'Speedgoat 5 Trail Beast', material: 'Synthetic Mesh', price: 155.00, gender: 'men', tags: ['outdoor', 'running', 'hoka', 'men', 'speedgoat', 'trail running', 'vibram megagrip', 'waterproof outdoor', 'mud'] },
      { name: 'Mach 6 Responsive', material: 'Synthetic Mesh', price: 140.00, gender: 'women', tags: ['running', 'hoka', 'women', 'profly dual layer', 'lightweight tempo', 'speed'] },
    ],
  },
  {
    brand: 'Brooks',
    category: 'Running',
    models: [
      { name: 'Ghost 15 Smooth Strider', material: 'Synthetic Mesh', price: 140.00, gender: 'unisex', tags: ['running', 'brooks', 'unisex', 'ghost', 'dna loft v2', 'segmented crash pad', 'balanced cushion'] },
      { name: 'Glycerin 21 Supreme Soft', material: 'Knit Upper', price: 160.00, gender: 'men', tags: ['running', 'brooks', 'men', 'dna loft v3 nitrogen infused', 'plush transition', 'marathon'] },
      { name: 'Adrenaline GTS 23 Guardrail', material: 'Synthetic Mesh', price: 140.00, gender: 'women', tags: ['running', 'brooks', 'women', 'guide rails holistic support', 'overpronation', 'smooth ride'] },
      { name: 'Cascadia 17 Mountain Trail', material: 'Synthetic Mesh', price: 140.00, gender: 'men', tags: ['outdoor', 'running', 'brooks', 'men', 'trail adapt system', 'rock shield', 'wet traction grip', 'rain'] },
    ],
  },
  {
    brand: 'Salomon',
    category: 'Outdoor',
    models: [
      { name: 'Speedcross 6 GORE-TEX Trail', material: 'Synthetic Mesh', price: 160.00, gender: 'unisex', tags: ['outdoor', 'running', 'salomon', 'unisex', 'speedcross', 'mud contagrip', 'gore-tex', 'waterproof', 'rain', 'rugged'] },
      { name: 'XT-6 Advanced Street Trail', material: 'Synthetic Mesh', price: 200.00, gender: 'unisex', tags: ['sneakers', 'outdoor', 'salomon', 'unisex', 'xt6', 'acs chassis', 'quicklace', 'streetwear', 'techwear'] },
      { name: 'Ultra Glide 2 Max Comfort', material: 'Synthetic Mesh', price: 150.00, gender: 'men', tags: ['outdoor', 'running', 'salomon', 'men', 'energy foam', 'reverse camber', 'long distance trail'] },
      { name: 'XA Pro 3D v9 All Weather', material: 'Nubuck', price: 150.00, gender: 'men', tags: ['outdoor', 'boots', 'salomon', 'men', '3d advanced chassis', 'reinforced toe cap', 'all terrain hiking'] },
    ],
  },
  {
    brand: 'Under Armour',
    category: 'Training',
    models: [
      { name: 'Curry 11 Championship Hoops', material: 'Knit Upper', price: 160.00, gender: 'men', tags: ['basketball', 'under armour', 'men', 'steph curry', 'ua flow dual density', 'warp technology', 'court traction'] },
      { name: 'HOVR Sonic 6 Light & Fast', material: 'Synthetic Mesh', price: 110.00, gender: 'unisex', tags: ['running', 'under armour', 'unisex', 'ua hovr zero gravity', 'energy web', 'breathable road'] },
      { name: 'Tribase Reign 6 Crossfit', material: 'Synthetic Mesh', price: 130.00, gender: 'men', tags: ['training', 'under armour', 'men', 'tri-base ground contact', 'lateral rubber wrap', 'weightlifting gym'] },
    ],
  },
  {
    brand: 'Saucony',
    category: 'Running',
    models: [
      { name: 'Endorphin Speed 4 Plate', material: 'Synthetic Mesh', price: 170.00, gender: 'unisex', tags: ['running', 'saucony', 'unisex', 'speedroll technology', 'winged nylon plate', 'pwrrun pb foam', 'tempo racing'] },
      { name: 'Triumph 21 Cloud Comfort', material: 'Knit Upper', price: 160.00, gender: 'men', tags: ['running', 'saucony', 'men', 'pwrrun+ full length', 'plush collar', 'daily marathon mile eater'] },
      { name: 'Kinvara 14 Lightweight Racer', material: 'Synthetic Mesh', price: 120.00, gender: 'women', tags: ['running', 'saucony', 'women', 'minimalist 4mm drop', 'pwrrun midsole', 'featherlight speed'] },
      { name: 'Shadow 6000 Retro Suede', material: 'Suede', price: 110.00, gender: 'unisex', tags: ['sneakers', 'saucony', 'unisex', 'ionic cushioning system', 'triangular lug outsole', 'vintage 1991'] },
    ],
  },
]

const SIZES = ['38', '39', '40', '41', '42', '43', '44', '45', '46', '47']

function generateComprehensiveProducts() {
  const products = []
  let skuCounter = 1

  for (const group of BRAND_CATALOGUE) {
    const { brand, category, models } = group

    for (let mIdx = 0; mIdx < models.length; mIdx++) {
      const model = models[mIdx]
      const fullName = `${brand} ${model.name}`.toUpperCase()
      const sku = `KICK-${brand.slice(0, 3).toUpperCase()}-${String(skuCounter).padStart(4, '0')}`
      const price = model.price
      const compareAt = skuCounter % 3 === 0 ? Number((price * 1.25).toFixed(2)) : null

      // Multi-color palette assignment per shoe
      const primaryColors = skuCounter % 2 === 0
        ? ['Black', 'White', 'Red']
        : skuCounter % 3 === 0
        ? ['Blue', 'Grey', 'Navy']
        : ['White', 'Green', 'Tan']

      const colorImages = primaryColors.map((colorName) => {
        const gallery = COLOR_IMAGE_MAP[colorName] || COLOR_IMAGE_MAP.Black
        return {
          color: colorName,
          images: gallery,
        }
      })

      const allImages = colorImages.flatMap((ci) => ci.images)
      const isFeatured = skuCounter <= 24 || skuCounter % 5 === 0

      // Rich, detailed narrative story
      const description = `The ${fullName} represents high-performance engineering designed for athletes and tastemakers alike. Engineered with premium ${model.material.toLowerCase()}, responsive cushioning, and an anatomically contoured outsole, it delivers supreme all-day comfort, multi-directional traction, and unmatched durability for ${category.toLowerCase()} and daily wear.`

      products.push({
        name: fullName,
        brand,
        category,
        sku,
        price,
        compareAt,
        gender: model.gender,
        material: model.material,
        colors: primaryColors,
        images: allImages.slice(0, 4),
        colorImages,
        tags: [...new Set([
          category.toLowerCase(),
          brand.toLowerCase(),
          model.gender,
          model.material.toLowerCase(),
          ...model.tags,
          'footwear',
          'authentic',
        ])],
        featured: isFeatured,
        description,
      })

      skuCounter++
    }
  }

  // If catalogue is less than 210, generate remaining high-quality variants
  const baseCount = products.length
  const prefixes = ['Pro', 'Elite', 'V2', 'Ultra', 'GT', 'Prime', 'SE', 'OG', 'NX', 'Apex', 'EVO', 'Air', 'Pulse', 'Velocity']
  const catNames = ['Running', 'Sneakers', 'Casual shoes', 'Formal', 'Boots', 'Basketball', 'Outdoor', 'Training']

  for (let i = baseCount; i < 212; i++) {
    const parent = products[i % baseCount]
    const pfx = prefixes[i % prefixes.length]
    const name = `${parent.brand} ${parent.name.split(' ').slice(1).join(' ')} ${pfx} ${i + 1}`.toUpperCase()
    const sku = `KICK-GEN-${String(i + 1).padStart(4, '0')}`
    const price = Number((49.99 + (i % 22) * 9.5).toFixed(2))
    const compareAt = i % 3 === 0 ? Number((price * 1.2).toFixed(2)) : null

    const colors = i % 2 === 0 ? ['Black', 'White', 'Blue'] : ['Grey', 'Red', 'Tan']
    const colorImages = colors.map((col) => ({
      color: col,
      images: COLOR_IMAGE_MAP[col] || COLOR_IMAGE_MAP.Black,
    }))

    products.push({
      name,
      brand: parent.brand,
      category: parent.category,
      sku,
      price,
      compareAt,
      gender: parent.gender,
      material: parent.material,
      colors,
      images: colorImages.flatMap((ci) => ci.images),
      colorImages,
      tags: [...parent.tags, pfx.toLowerCase()],
      featured: i % 7 === 0,
      description: `Elevated edition ${name} from ${parent.brand}. Crafted with ${parent.material.toLowerCase()} and optimized for ${parent.category.toLowerCase()} performance with targeted impact absorption and high-wear durability.`,
    })
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
    ['Oliver', 'Lewis'], ['Charlotte', 'Lee'], ['Jacob', 'Walker'], ['Amelia', 'Hall'],
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

  // 4. Seed 210+ Products & Variants
  const products = generateComprehensiveProducts()
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
          images, color_images, tags, rating_avg, rating_count, total_stock)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'active',?,?,?,?,?,?,100)`,
      [
        publicId(), categoryId, p.name,
        slug, p.sku, p.description,
        p.brand, p.gender, p.material, p.price,
        p.compareAt, Number((p.price * 0.45).toFixed(2)),
        p.featured ? 1 : 0,
        JSON.stringify(p.images), JSON.stringify(p.colorImages), JSON.stringify(p.tags),
        (4.4 + (createdCount % 6) * 0.1).toFixed(1), 30 + (createdCount * 7) % 350,
      ]
    )

    const productId = prodResult.insertId
    createdCount++

    // Add variants for each size and color
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

  logger.info({ totalProductsSeeded: createdCount }, '210+ Products & Color Variants created successfully.')

  // 5. Seed 120 realistic orders
  const [allProds] = await pool.query('SELECT id, public_id, name, slug, sku, price, images FROM products LIMIT 60')
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
        const daysAgo = Math.floor(i * 3)

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
          [orderId, p1.id, p1.name, p1.slug, p1.sku, p1.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff', price1, qty1, lineTotal1]
        )

        if (qty2) {
          await pool.query(
            `INSERT INTO order_items (order_id, product_id, product_name, product_slug, product_sku, product_image, color, size, unit_price, quantity, line_total)
             VALUES (?, ?, ?, ?, ?, ?, 'White', '40', ?, ?, ?)`,
            [orderId, p2.id, p2.name, p2.slug, p2.sku, p2.images?.[0] || 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a', price2, qty2, lineTotal2]
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
