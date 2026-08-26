import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { adminDashboardApi } from '../lib/api'

export const fetchOverview = createAsyncThunk(
  'adminDashboard/overview',
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminDashboardApi.getOverview()
      return res.data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load overview')
    }
  }
)

export const fetchSalesChart = createAsyncThunk(
  'adminDashboard/salesChart',
  async (period, { rejectWithValue }) => {
    try {
      const res = await adminDashboardApi.getSalesChart(period)
      return res.data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load sales chart')
    }
  }
)

export const fetchRecentOrders = createAsyncThunk(
  'adminDashboard/recentOrders',
  async (limit, { rejectWithValue }) => {
    try {
      const res = await adminDashboardApi.getRecentOrders(limit)
      return res.data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load recent orders')
    }
  }
)

export const fetchTopProducts = createAsyncThunk(
  'adminDashboard/topProducts',
  async (limit, { rejectWithValue }) => {
    try {
      const res = await adminDashboardApi.getTopProducts(limit)
      return res.data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load top products')
    }
  }
)

const adminDashboardSlice = createSlice({
  name: 'adminDashboard',
  initialState: {
    overview: null,
    salesChart: [],
    recentOrders: [],
    topProducts: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOverview.pending, (s) => {
        s.loading = true
      })
      .addCase(fetchOverview.fulfilled, (s, a) => {
        s.loading = false
        s.overview = a.payload
      })
      .addCase(fetchOverview.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(fetchSalesChart.fulfilled, (s, a) => {
        s.salesChart = a.payload || []
      })

      .addCase(fetchRecentOrders.fulfilled, (s, a) => {
        s.recentOrders = a.payload || []
      })

      .addCase(fetchTopProducts.fulfilled, (s, a) => {
        s.topProducts = a.payload || []
      })
  },
})

export default adminDashboardSlice.reducer
