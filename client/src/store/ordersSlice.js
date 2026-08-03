import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { ordersApi } from '../lib/api'

export const placeOrder = createAsyncThunk('orders/place', async (body, { rejectWithValue }) => {
  try {
    const res = await ordersApi.create(body)
    return res.data
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to place order')
  }
})

export const fetchMyOrders = createAsyncThunk('orders/listMine', async (_, { rejectWithValue }) => {
  try {
    const res = await ordersApi.listMine()
    return res.data
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch orders')
  }
}, {
  condition: (_, { getState }) => {
    const state = getState().orders
    return !state.loading && !state.loaded
  },
})

export const quoteOrder = createAsyncThunk('orders/quote', async (body, { rejectWithValue }) => {
  try {
    const res = await ordersApi.quote(body)
    return res.data
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to calculate quote')
  }
})

const ordersSlice = createSlice({
  name: 'orders',
  initialState: { items: [], current: null, quote: null, loading: false, error: null, loaded: false },
  reducers: {
    clearCurrentOrder: (state) => {
      state.current = null
      state.quote = null
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(placeOrder.pending, (s) => {
        s.loading = true
        s.error = null
      })
      .addCase(placeOrder.fulfilled, (s, a) => {
        s.loading = false
        s.current = a.payload
      })
      .addCase(placeOrder.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(fetchMyOrders.pending, (s) => {
        s.loading = true
      })
      .addCase(fetchMyOrders.fulfilled, (s, a) => {
        s.loading = false
        s.items = a.payload || []
        s.loaded = true
      })
      .addCase(fetchMyOrders.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(quoteOrder.fulfilled, (s, a) => {
        s.quote = a.payload
      })
  },
})

export const { clearCurrentOrder } = ordersSlice.actions
export default ordersSlice.reducer
