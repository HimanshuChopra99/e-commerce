import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { adminOrdersApi } from '../lib/api'

export const fetchAdminOrders = createAsyncThunk('adminOrders/list', async (params, { rejectWithValue }) => {
  try {
    const res = await adminOrdersApi.list(params)
    return res
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch orders')
  }
})

export const fetchAdminOrderById = createAsyncThunk('adminOrders/getOne', async (id, { rejectWithValue }) => {
  try {
    const res = await adminOrdersApi.getOne(id)
    return res.data
  } catch (err) {
    return rejectWithValue(err.message || 'Order not found')
  }
})

export const updateOrderStatus = createAsyncThunk('adminOrders/updateStatus', async ({ id, status }, { rejectWithValue }) => {
  try {
    const res = await adminOrdersApi.updateStatus(id, status)
    return res.data
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to update order status')
  }
})

const adminOrdersSlice = createSlice({
  name: 'adminOrders',
  initialState: {
    items: [],
    current: null,
    meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentAdminOrder: (state) => {
      state.current = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminOrders.pending, (s) => {
        s.loading = true
        s.error = null
      })
      .addCase(fetchAdminOrders.fulfilled, (s, a) => {
        s.loading = false
        s.items = a.payload.data || []
        s.meta = a.payload.meta || { page: 1, limit: 10, total: 0, totalPages: 1 }
      })
      .addCase(fetchAdminOrders.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(fetchAdminOrderById.fulfilled, (s, a) => {
        s.current = a.payload
      })

      .addCase(updateOrderStatus.fulfilled, (s, a) => {
        if (s.current && (s.current.id === a.payload.id || s.current.orderNumber === a.payload.orderNumber)) {
          s.current.status = a.payload.status
        }
        const found = s.items.find((i) => i.id === a.payload.id || i.orderNumber === a.payload.orderNumber)
        if (found) {
          found.status = a.payload.status
        }
      })
  },
})

export const { clearCurrentAdminOrder } = adminOrdersSlice.actions
export default adminOrdersSlice.reducer
