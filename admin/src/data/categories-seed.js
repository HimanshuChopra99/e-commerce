/**
 * Starter categories for the demo store.
 *
 * These are seeded into the catalog store on first load; after that the admin's
 * own categories (created in the UI) are persisted to localStorage.
 *
 * The ids are stable so `src/data/seed.ts` can assign products to them.
 */
export const seedCategories = [
  {
    id: 'CAT-RUNNING',
    name: 'Running',
    slug: 'running',
    description:
      'Road and trail shoes built for distance, speed and daily training.',
    color: 'blue',
    image: '/products/running-01.png',
    createdAt: new Date('2025-02-10'),
    updatedAt: new Date('2026-06-02'),
  },
  {
    id: 'CAT-SNEAKERS',
    name: 'Sneakers',
    slug: 'sneakers',
    description: 'Everyday low-tops, high-tops and lifestyle silhouettes.',
    color: 'teal',
    image: '/products/sneaker-01.png',
    createdAt: new Date('2025-02-10'),
    updatedAt: new Date('2026-05-18'),
  },
  {
    id: 'CAT-FORMAL',
    name: 'Formal',
    slug: 'formal',
    description: 'Oxfords, derbies and loafers for the office and occasions.',
    color: 'slate',
    image: '/products/formal-01.png',
    createdAt: new Date('2025-03-04'),
    updatedAt: new Date('2026-04-21'),
  },
  {
    id: 'CAT-BOOTS',
    name: 'Boots',
    slug: 'boots',
    description: 'Hiking, chelsea and weatherproof boots for rough ground.',
    color: 'amber',
    image: '/products/boot-01.png',
    createdAt: new Date('2025-03-04'),
    updatedAt: new Date('2026-06-30'),
  },
]
