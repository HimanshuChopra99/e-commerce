import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { adminCategoriesApi } from '../lib/api'

export const fetchAdminCategories = createAsyncThunk(
  'adminCategories/list',
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminCategoriesApi.list()
      return res.data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch categories')
    }
  }
)

export const createAdminCategory = createAsyncThunk(
  'adminCategories/create',
  async (body, { rejectWithValue }) => {
    try {
      const res = await adminCategoriesApi.create(body)
      return res.data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to create category')
    }
  }
)

export const updateAdminCategory = createAsyncThunk(
  'adminCategories/update',
  async ({ id, body }, { rejectWithValue }) => {
    try {
      const res = await adminCategoriesApi.update(id, body)
      return res.data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update category')
    }
  }
)

export const deleteAdminCategory = createAsyncThunk(
  'adminCategories/delete',
  async (id, { rejectWithValue }) => {
    try {
      await adminCategoriesApi.delete(id)
      return id
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to delete category')
    }
  }
)

const adminCategoriesSlice = createSlice({
  name: 'adminCategories',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminCategories.pending, (s) => {
        s.loading = true
      })
      .addCase(fetchAdminCategories.fulfilled, (s, a) => {
        s.loading = false
        s.items = a.payload || []
      })
      .addCase(fetchAdminCategories.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(createAdminCategory.fulfilled, (s, a) => {
        s.items.push(a.payload)
      })

      .addCase(deleteAdminCategory.fulfilled, (s, a) => {
        s.items = s.items.filter((i) => i.id !== a.payload)
      })
  },
})

export default adminCategoriesSlice.reducer
