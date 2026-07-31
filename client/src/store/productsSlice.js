import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { productsApi } from '../lib/api'

export const fetchProducts = createAsyncThunk('products/list', async (params, { rejectWithValue }) => {
  try {
    const res = await productsApi.list(params)
    return res
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch products')
  }
})

export const fetchFeaturedProducts = createAsyncThunk('products/featured', async (_, { rejectWithValue }) => {
  try {
    const res = await productsApi.featured()
    return res.data
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch featured products')
  }
})

export const fetchProductBySlug = createAsyncThunk('products/getBySlug', async (slug, { rejectWithValue }) => {
  try {
    const res = await productsApi.getBySlug(slug)
    return res.data
  } catch (err) {
    return rejectWithValue(err.message || 'Product not found')
  }
})

export const fetchFilters = createAsyncThunk('products/filters', async (_, { rejectWithValue }) => {
  try {
    const res = await productsApi.filters()
    return res.data
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch filters')
  }
})

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    featured: [],
    current: null,
    filters: { sizes: [], genders: [], colors: [] },
    meta: { page: 1, limit: 9, total: 0, totalPages: 1 },
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentProduct: (state) => {
      state.current = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (s) => {
        s.loading = true
        s.error = null
      })
      .addCase(fetchProducts.fulfilled, (s, a) => {
        s.loading = false
        s.items = a.payload.data || []
        s.meta = a.payload.meta || { page: 1, limit: 9, total: 0, totalPages: 1 }
      })
      .addCase(fetchProducts.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(fetchFeaturedProducts.fulfilled, (s, a) => {
        s.featured = a.payload || []
      })

      .addCase(fetchProductBySlug.pending, (s) => {
        s.loading = true
        s.error = null
      })
      .addCase(fetchProductBySlug.fulfilled, (s, a) => {
        s.loading = false
        s.current = a.payload
      })
      .addCase(fetchProductBySlug.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(fetchFilters.fulfilled, (s, a) => {
        s.filters = a.payload || { sizes: [], genders: [], colors: [] }
      })
  },
})

export const { clearCurrentProduct } = productsSlice.actions
export default productsSlice.reducer
