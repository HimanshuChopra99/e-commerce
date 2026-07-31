import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { slugifyCategory } from '@/features/categories/categories-data'

/* -------------------------------------------------------------------------- */
/*  Live catalogue state.                                                     */
/* -------------------------------------------------------------------------- */

const makeId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase()

export const useCatalogStore = create()(
  persist(
    (set, get) => ({
      categories: [],
      products: [],
      isLoading: false,
      error: null,

      fetchCatalog: async () => {
        set({ isLoading: true })
        try {
          const [catRes, prodRes] = await Promise.all([
            fetch('/api/categories').catch(() => null),
            fetch('/api/products?limit=100').catch(() => null),
          ])

          let categories = get().categories
          let products = get().products

          if (catRes && catRes.ok) {
            const data = await catRes.json()
            if (Array.isArray(data.data)) {
              categories = data.data
            }
          }

          if (prodRes && prodRes.ok) {
            const data = await prodRes.json()
            if (data.data?.items && Array.isArray(data.data.items)) {
              products = data.data.items.map((p) => ({
                ...p,
                id: p.id || p.publicId,
                totalStock: p.totalStock !== undefined ? p.totalStock : (p.sizes ? p.sizes.length * 10 : 20),
                status: p.status || 'active',
                tags: p.tags || [p.gender, p.category?.name].filter(Boolean),
              }))
            }
          }

          set({ categories, products, isLoading: false })
        } catch (err) {
          console.warn('Backend sync warning:', err)
          set({ isLoading: false })
        }
      },

      addCategory: async (input) => {
        const now = new Date()
        const category = {
          id: makeId('CAT'),
          name: input.name.trim(),
          slug: slugifyCategory(input.name),
          description: input.description.trim(),
          color: input.color,
          image: input.image ?? null,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          categories: [category, ...state.categories],
        }))

        try {
          const res = await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.data) {
              set((state) => ({
                categories: state.categories.map((c) => (c.id === category.id ? data.data : c)),
              }))
            }
          }
        } catch (err) {
          console.warn('API addCategory warning:', err)
        }

        return category
      },

      updateCategory: async (id, input) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...input,
                  name: input.name?.trim() ?? c.name,
                  slug: input.name ? slugifyCategory(input.name) : c.slug,
                  updatedAt: new Date(),
                }
              : c
          ),
        }))

        try {
          await fetch(`/api/admin/categories/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
          })
        } catch (err) {
          console.warn('API updateCategory warning:', err)
        }
      },

      deleteCategory: async (id) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
          products: state.products.map((p) =>
            p.categoryId === id ? { ...p, categoryId: null } : p
          ),
        }))

        try {
          await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
        } catch (err) {
          console.warn('API deleteCategory warning:', err)
        }
      },

      addProduct: async (product) => {
        set((state) => ({
          products: [product, ...state.products],
        }))

        try {
          await fetch('/api/admin/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(product),
          })
        } catch (err) {
          console.warn('API addProduct warning:', err)
        }
      },

      updateProduct: async (id, patch) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...patch, updatedAt: new Date() } : p
          ),
        }))

        try {
          await fetch(`/api/admin/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          })
        } catch (err) {
          console.warn('API updateProduct warning:', err)
        }
      },

      deleteProduct: async (id) => {
        set((state) => ({
          products: state.products.filter((p) => (p.id || p.publicId) !== id),
        }))

        try {
          await fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
        } catch (err) {
          console.warn('API deleteProduct warning:', err)
        }
      },

      assignProductsToCategory: async (categoryId, productIds) => {
        set((state) => ({
          products: state.products.map((p) =>
            productIds.includes(p.id) ? { ...p, categoryId, updatedAt: new Date() } : p
          ),
        }))

        try {
          await fetch(`/api/admin/categories/${categoryId}/products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productIds }),
          })
        } catch (err) {
          console.warn('API assignProductsToCategory warning:', err)
        }
      },

      removeProductFromCategory: async (productId) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === productId ? { ...p, categoryId: null, updatedAt: new Date() } : p
          ),
        }))
      },

      resetCatalog: () =>
        set({
          categories: [],
          products: [],
        }),
    }),
    {
      name: 'Kick-catalog',
      merge: (persisted, current) => {
        const saved = persisted
        if (!saved) return current
        return {
          ...current,
          ...saved,
          categories: (saved.categories ?? current.categories).map((c) => ({
            ...c,
            createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
            updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
          })),
          products: (saved.products ?? current.products).map((p) => ({
            ...p,
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
            updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
          })),
        }
      },
    }
  )
)

/* ------------------------------ Selectors -------------------------------- */

export function selectProductsInCategory(products, categoryId) {
  return products.filter((p) => p.categoryId === categoryId || p.category?.id === categoryId)
}

export function selectCategoryCounts(products) {
  const counts = new Map()
  products.forEach((p) => {
    const catId = p.categoryId || p.category?.id
    if (!catId) return
    counts.set(catId, (counts.get(catId) ?? 0) + 1)
  })
  return counts
}
