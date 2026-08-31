import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { adminAuthApi, setAccessToken } from '../lib/api'

export const loginAdmin = createAsyncThunk(
  'adminAuth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const res = await adminAuthApi.login(credentials)
      if (res.data?.accessToken) {
        setAccessToken(res.data.accessToken)
      }
      return res.data
    } catch (err) {
      return rejectWithValue(err.message || 'Login failed')
    }
  }
)

export const fetchAdminMe = createAsyncThunk(
  'adminAuth/me',
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminAuthApi.me()
      return res.data
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const logoutAdmin = createAsyncThunk(
  'adminAuth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await adminAuthApi.logout()
      setAccessToken(null)
    } catch (err) {
      setAccessToken(null)
      return rejectWithValue(err.message)
    }
  }
)

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState: {
    user: null,
    loading: false,
    error: null,
    initialized: false,
  },
  reducers: {
    clearAdminError: (state) => {
      state.error = null
    },
    logoutLocal: (state) => {
      setAccessToken(null)
      state.user = null
      state.error = null
      state.loading = false
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAdmin.pending, (s) => {
        s.loading = true
        s.error = null
      })
      .addCase(loginAdmin.fulfilled, (s, a) => {
        s.loading = false
        s.user = a.payload.user
      })
      .addCase(loginAdmin.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(fetchAdminMe.fulfilled, (s, a) => {
        s.user = a.payload
        s.initialized = true
      })
      .addCase(fetchAdminMe.rejected, (s) => {
        s.user = null
        s.initialized = true
      })

      .addCase(logoutAdmin.pending, (s) => {
        s.loading = true
      })
      .addCase(logoutAdmin.fulfilled, (s) => {
        s.loading = false
        s.user = null
        s.error = null
      })
      .addCase(logoutAdmin.rejected, (s) => {
        s.loading = false
        s.user = null
        s.error = null
      })
  },
})

export const { clearAdminError, logoutLocal } = adminAuthSlice.actions
export default adminAuthSlice.reducer
