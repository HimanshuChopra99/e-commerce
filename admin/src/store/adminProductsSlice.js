import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { adminProductsApi } from '../lib/api'

export const fetchAdminProducts = createAsyncThunk('adminProducts/list', async (params, { rejectWithValue }) => {
  try {
    const res = await adminProductsApi.list(params)
    return res
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch products')
  }
})

export const fetchAdminProductById = createAsyncThunk('adminProducts/getOne', async (id, { rejectWithValue }) => {
  try {
    const res = await adminProductsApi.getOne(id)
    return res.data
  } catch (err) {
    return rejectWithValue(err.message || 'Product not found')
  }
})

export const createAdminProduct = createAsyncThunk('adminProducts/create', async (body, { rejectWithValue }) => {
  try {
    const res = await adminProductsApi.create(body)
    return res.data
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to create product')
  }
})

export const updateAdminProduct = createAsyncThunk('adminProducts/update', async ({ id, body }, { rejectWithValue }) => {
  try {
    const res = await adminProductsApi.update(id, body)
    return res.data
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to update product')
  }
})

export const deleteAdminProduct = createAsyncThunk('adminProducts/delete', async (id, { rejectWithValue }) => {
  try {
    await adminProductsApi.delete(id)
    return id
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to delete product')
  }
})

const adminProductsSlice = createSlice({
  name: 'adminProducts',
  initialState: {
    items: [],
    current: null,
    meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentAdminProduct: (state) => {
      state.current = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminProducts.pending, (s) => {
        s.loading = true
        s.error = null
      })
      .addCase(fetchAdminProducts.fulfilled, (s, a) => {
        s.loading = false
        s.items = a.payload.data || []
        s.meta = a.payload.meta || { page: 1, limit: 10, total: 0, totalPages: 1 }
      })
      .addCase(fetchAdminProducts.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(fetchAdminProductById.pending, (s) => { s.loading = true })
      .addCase(fetchAdminProductById.fulfilled, (s, a) => {
        s.loading = false
        s.current = a.payload
      })
      .addCase(fetchAdminProductById.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(deleteAdminProduct.fulfilled, (s, a) => {
        s.items = s.items.filter((i) => (i.id || i.publicId) !== a.payload)
      })
  },
})

export const { clearCurrentAdminProduct } = adminProductsSlice.actions
export default adminProductsSlice.reducer
