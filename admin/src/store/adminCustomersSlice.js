import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { adminCustomersApi } from '../lib/api'

export const fetchAdminCustomers = createAsyncThunk(
  'adminCustomers/list',
  async (params, { rejectWithValue }) => {
    try {
      const res = await adminCustomersApi.list(params)
      return res
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch customers')
    }
  }
)

export const fetchAdminCustomerById = createAsyncThunk(
  'adminCustomers/getOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await adminCustomersApi.getOne(id)
      return res.data
    } catch (err) {
      return rejectWithValue(err.message || 'Customer not found')
    }
  }
)

const adminCustomersSlice = createSlice({
  name: 'adminCustomers',
  initialState: {
    items: [],
    current: null,
    meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminCustomers.pending, (s) => {
        s.loading = true
      })
      .addCase(fetchAdminCustomers.fulfilled, (s, a) => {
        s.loading = false
        s.items = a.payload.data || []
        s.meta = a.payload.meta || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        }
      })
      .addCase(fetchAdminCustomers.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(fetchAdminCustomerById.fulfilled, (s, a) => {
        s.current = a.payload
      })
  },
})

export default adminCustomersSlice.reducer
