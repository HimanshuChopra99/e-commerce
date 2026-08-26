import { create } from 'zustand'
import { adminCategoriesApi, adminProductsApi } from '@/lib/api'

/**
 * The catalog is server state. Do not persist it in browser storage: doing so
 * makes failed mutations look real and lets stale inventory outlive a deploy.
 */
export const useCatalogStore = create((set, get) => ({
  categories: [],
  products: [],
  isLoading: false,
  error: null,

  fetchCatalog: async () => {
    set({ isLoading: true, error: null })
    try {
      const [categoriesResponse, productsResponse] = await Promise.all([
        adminCategoriesApi.list(),
        adminProductsApi.list({ limit: 100 }),
      ])
      set({
        categories: categoriesResponse.data || [],
        products: productsResponse.data || [],
        isLoading: false,
      })
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Unable to load catalogue.',
      })
      throw error
    }
  },

  addCategory: async (input) => {
    const response = await adminCategoriesApi.create(input)
    const category = response.data
    set((state) => ({ categories: [category, ...state.categories] }))
    return category
  },

  updateCategory: async (id, input) => {
    const response = await adminCategoriesApi.update(id, input)
    const category = response.data
    set((state) => ({
      categories: state.categories.map((item) =>
        item.id === id ? category : item
      ),
    }))
    return category
  },

  deleteCategory: async (id) => {
    await adminCategoriesApi.delete(id)
    set((state) => ({
      categories: state.categories.filter((item) => item.id !== id),
      products: state.products.map((product) =>
        product.categoryId === id
          ? { ...product, categoryId: null, category: null }
          : product
      ),
    }))
  },

  fetchProduct: async (id) => {
    const response = await adminProductsApi.getOne(id)
    const product = response.data
    set((state) => ({
      products: state.products.map((item) => (item.id === id ? product : item)),
    }))
    return product
  },

  uploadProductImages: async (files) => {
    const response = await adminProductsApi.uploadImages(files)
    return response.data?.images || []
  },

  addProduct: async (input) => {
    const response = await adminProductsApi.create(input)
    const product = response.data
    set((state) => ({ products: [product, ...state.products] }))
    return product
  },

  updateProduct: async (id, input) => {
    const response = await adminProductsApi.update(id, input)
    const product = response.data
    set((state) => ({
      products: state.products.map((item) => (item.id === id ? product : item)),
    }))
    return product
  },

  deleteProduct: async (id) => {
    await adminProductsApi.delete(id)
    set((state) => ({
      products: state.products.filter((item) => item.id !== id),
    }))
  },

  bulkUpdateProductStatus: async (productIds, status) => {
    await adminProductsApi.bulkStatus(productIds, status)
    set((state) => ({
      products: state.products.map((product) =>
        productIds.includes(product.id) ? { ...product, status } : product
      ),
    }))
  },

  bulkDeleteProducts: async (productIds) => {
    await adminProductsApi.bulkDelete(productIds)
    set((state) => ({
      products: state.products.filter(
        (product) => !productIds.includes(product.id)
      ),
    }))
  },

  assignProductsToCategory: async (categoryId, productIds) => {
    await adminCategoriesApi.assignProducts(categoryId, productIds)
    await get().fetchCatalog()
  },

  removeProductFromCategory: async (categoryId, productId) => {
    await adminCategoriesApi.removeProduct(categoryId, productId)
    set((state) => ({
      products: state.products.map((product) =>
        product.id === productId
          ? { ...product, categoryId: null, category: null }
          : product
      ),
    }))
  },

  resetCatalog: () => set({ categories: [], products: [], error: null }),
}))

/* ------------------------------ Selectors -------------------------------- */

export function selectProductsInCategory(products, categoryId) {
  return products.filter(
    (p) => p.categoryId === categoryId || p.category?.id === categoryId
  )
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
