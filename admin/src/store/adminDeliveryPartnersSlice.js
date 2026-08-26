import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { adminDeliveryPartnersApi } from '../lib/api'

export const fetchAdminDeliveryPartners = createAsyncThunk(
  'adminDeliveryPartners/list',
  async (params, { rejectWithValue }) => {
    try {
      const res = await adminDeliveryPartnersApi.list(params)
      return res
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch delivery partners')
    }
  }
)

export const fetchAdminDeliveryPartnerById = createAsyncThunk(
  'adminDeliveryPartners/getOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await adminDeliveryPartnersApi.getOne(id)
      return res.data
    } catch (err) {
      return rejectWithValue(err.message || 'Delivery partner not found')
    }
  }
)

export const createAdminDeliveryPartner = createAsyncThunk(
  'adminDeliveryPartners/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await adminDeliveryPartnersApi.create(payload)
      return res.data
    } catch (err) {
      return rejectWithValue(
        err.message || 'Failed to register delivery partner'
      )
    }
  }
)

export const updateAdminDeliveryPartner = createAsyncThunk(
  'adminDeliveryPartners/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const res = await adminDeliveryPartnersApi.update(id, payload)
      return res.data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update delivery partner')
    }
  }
)

export const updateAdminDeliveryPartnerStatus = createAsyncThunk(
  'adminDeliveryPartners/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const res = await adminDeliveryPartnersApi.updateStatus(id, status)
      return res.data
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update status')
    }
  }
)

export const removeAdminDeliveryPartner = createAsyncThunk(
  'adminDeliveryPartners/remove',
  async (id, { rejectWithValue }) => {
    try {
      await adminDeliveryPartnersApi.remove(id)
      return id
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to delete delivery partner')
    }
  }
)

const adminDeliveryPartnersSlice = createSlice({
  name: 'adminDeliveryPartners',
  initialState: {
    items: [],
    current: null,
    meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentDeliveryPartner: (s) => {
      s.current = null
    },
    // Live update pushed over the socket when a partner toggles online/offline
    partnerOnlineStatusUpdated: (s, a) => {
      const { partnerPublicId, isOnline } = a.payload
      s.items = s.items.map((p) =>
        String(p.publicId) === String(partnerPublicId) ||
        String(p.id) === String(partnerPublicId)
          ? { ...p, isOnline: Boolean(isOnline) }
          : p
      )
      if (s.current && String(s.current.publicId) === String(partnerPublicId)) {
        s.current = { ...s.current, isOnline: Boolean(isOnline) }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminDeliveryPartners.pending, (s) => {
        s.loading = true
      })
      .addCase(fetchAdminDeliveryPartners.fulfilled, (s, a) => {
        s.loading = false
        s.items = a.payload.data || []
        s.meta = a.payload.meta || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 1,
        }
      })
      .addCase(fetchAdminDeliveryPartners.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(fetchAdminDeliveryPartnerById.fulfilled, (s, a) => {
        s.current = a.payload
      })
      .addCase(fetchAdminDeliveryPartnerById.rejected, (s, a) => {
        s.error = a.payload
      })

      .addCase(createAdminDeliveryPartner.fulfilled, (s, a) => {
        s.items = [a.payload, ...s.items]
      })
      .addCase(updateAdminDeliveryPartner.fulfilled, (s, a) => {
        s.current = a.payload
        s.items = s.items.map((p) =>
          String(p.publicId) === String(a.payload.publicId) ||
          String(p.id) === String(a.payload.publicId)
            ? a.payload
            : p
        )
      })
      .addCase(updateAdminDeliveryPartnerStatus.fulfilled, (s, a) => {
        s.current = a.payload
        s.items = s.items.map((p) =>
          String(p.publicId) === String(a.payload.publicId) ||
          String(p.id) === String(a.payload.publicId)
            ? a.payload
            : p
        )
      })
      .addCase(removeAdminDeliveryPartner.fulfilled, (s, a) => {
        s.items = s.items.filter(
          (p) =>
            String(p.publicId) !== String(a.payload) &&
            String(p.id) !== String(a.payload)
        )
        if (s.current && String(s.current.publicId) === String(a.payload)) {
          s.current = null
        }
      })
  },
})

export const { clearCurrentDeliveryPartner, partnerOnlineStatusUpdated } =
  adminDeliveryPartnersSlice.actions

export default adminDeliveryPartnersSlice.reducer
