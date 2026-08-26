import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { adminOrdersApi } from '../lib/api'

export const fetchAdminOrders = createAsyncThunk(
  'adminOrders/list',
  async (params, { rejectWithValue }) => {
    try {
      const res = await adminOrdersApi.list(params)
      return res
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch orders')
    }
  }
)

export const fetchAdminOrderById = createAsyncThunk(
  'adminOrders/getOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await adminOrdersApi.getOne(id)
      return res.data
    } catch (err) {
      return rejectWithValue(err.message || 'Order not found')
    }
  }
)

/** Single order status update — passes optional extra fields (courier, trackingNumber) */
export const updateOrderStatus = createAsyncThunk(
  'adminOrders/updateStatus',
  async ({ id, status, extra = {} }, { rejectWithValue }) => {
    try {
      const res = await adminOrdersApi.updateStatus(id, status, extra)
      return res.data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update order status')
    }
  }
)

/** Bulk status update — fires all requests in parallel, each with optional extra fields */
export const bulkUpdateOrderStatus = createAsyncThunk(
  'adminOrders/bulkUpdateStatus',
  async ({ ids, status, extra = {} }, { rejectWithValue }) => {
    try {
      const results = await Promise.all(
        ids.map((id) =>
          adminOrdersApi.updateStatus(id, status, extra).then((r) => r.data)
        )
      )
      return results
    } catch (err) {
      return rejectWithValue(
        err.message || 'Failed to bulk update order status'
      )
    }
  }
)

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
    orderStatusUpdated: (state, action) => {
      const { orderId, status, trackingNumber, partnerName } =
        action.payload || {}
      if (!orderId || !status) return

      const matches = (o) =>
        String(o.id) === String(orderId) ||
        String(o.publicId) === String(orderId) ||
        String(o.public_id) === String(orderId) ||
        String(o.orderNumber) === String(orderId) ||
        String(o.order_number) === String(orderId)

      const item = state.items.find(matches)
      if (item) {
        item.status = status
        if (trackingNumber) item.trackingNumber = trackingNumber
        if (partnerName) item.courier = partnerName
      }
      if (state.current && matches(state.current)) {
        state.current.status = status
        if (trackingNumber) state.current.trackingNumber = trackingNumber
        if (partnerName) state.current.courier = partnerName
      }
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
        s.meta = a.payload.meta || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        }
      })
      .addCase(fetchAdminOrders.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(fetchAdminOrderById.fulfilled, (s, a) => {
        s.current = a.payload
      })

      .addCase(updateOrderStatus.fulfilled, (s, a) => {
        if (!a.payload) return
        if (
          s.current &&
          (s.current.id === a.payload.id ||
            s.current.orderNumber === a.payload.orderNumber)
        ) {
          s.current.status = a.payload.status
          if (a.payload.trackingNumber)
            s.current.trackingNumber = a.payload.trackingNumber
          if (a.payload.courier) s.current.courier = a.payload.courier
        }
        const found = s.items.find(
          (i) =>
            i.id === a.payload.id || i.orderNumber === a.payload.orderNumber
        )
        if (found) {
          found.status = a.payload.status
          if (a.payload.trackingNumber)
            found.trackingNumber = a.payload.trackingNumber
          if (a.payload.courier) found.courier = a.payload.courier
        }
      })

      .addCase(bulkUpdateOrderStatus.fulfilled, (s, a) => {
        const updated = a.payload || []
        updated.forEach((payload) => {
          if (!payload) return
          const found = s.items.find(
            (i) => i.id === payload.id || i.orderNumber === payload.orderNumber
          )
          if (found) {
            found.status = payload.status
            if (payload.trackingNumber)
              found.trackingNumber = payload.trackingNumber
            if (payload.courier) found.courier = payload.courier
          }
          if (
            s.current &&
            (s.current.id === payload.id ||
              s.current.orderNumber === payload.orderNumber)
          ) {
            s.current.status = payload.status
            if (payload.trackingNumber)
              s.current.trackingNumber = payload.trackingNumber
            if (payload.courier) s.current.courier = payload.courier
          }
        })
      })
  },
})

export const { clearCurrentAdminOrder, orderStatusUpdated } =
  adminOrdersSlice.actions
export default adminOrdersSlice.reducer
