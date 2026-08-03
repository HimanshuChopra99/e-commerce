import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authApi, setAccessToken, silentRefresh } from '../lib/api'
import { clearCart } from './cartSlice'

export const loginUser = createAsyncThunk('auth/login', async (credentials, { dispatch, rejectWithValue }) => {
  try {
    const res = await authApi.login(credentials)
    if (res.data?.accessToken) {
      setAccessToken(res.data.accessToken)
    }
    return res.data
  } catch (err) {
    return rejectWithValue(err.message || 'Login failed')
  }
})

export const registerUser = createAsyncThunk('auth/register', async (body, { dispatch, rejectWithValue }) => {
  try {
    const res = await authApi.register(body)
    if (res.data?.accessToken) {
      setAccessToken(res.data.accessToken)
    }
    return res.data
  } catch (err) {
    return rejectWithValue(err.message || 'Registration failed')
  }
})

export const logoutUser = createAsyncThunk('auth/logout', async (_, { dispatch, rejectWithValue }) => {
  try {
    await authApi.logout()
    setAccessToken(null)
    dispatch(clearCart())
  } catch (err) {
    setAccessToken(null)
    dispatch(clearCart())
    return rejectWithValue(err.message)
  }
})

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    // On every page load the in-memory access token is gone.
    // Silently exchange the HttpOnly refresh cookie for a fresh access token
    // before calling /me — this is what keeps the user logged in across refreshes.
    const refreshed = await silentRefresh()
    if (!refreshed) {
      // No valid refresh cookie — user is genuinely not logged in.
      return rejectWithValue('No session')
    }
    const res = await authApi.me()
    // Server returns { user: null } with 200 when not authenticated.
    if (!res.data || (res.data && 'authenticated' in res.data && !res.data.authenticated)) {
      return rejectWithValue('No session')
    }
    return res.data
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: false,
    error: null,
    initialized: false,
  },
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    setUser: (state, action) => {
      state.user = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (s) => {
        s.loading = true
        s.error = null
      })
      .addCase(loginUser.fulfilled, (s, a) => {
        s.loading = false
        s.user = a.payload.user
      })
      .addCase(loginUser.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(registerUser.pending, (s) => {
        s.loading = true
        s.error = null
      })
      .addCase(registerUser.fulfilled, (s, a) => {
        s.loading = false
        s.user = a.payload.user
      })
      .addCase(registerUser.rejected, (s, a) => {
        s.loading = false
        s.error = a.payload
      })

      .addCase(logoutUser.fulfilled, (s) => {
        s.user = null
      })

      .addCase(fetchMe.fulfilled, (s, a) => {
        s.user = a.payload
        s.initialized = true
      })
      .addCase(fetchMe.rejected, (s) => {
        s.user = null
        s.initialized = true
      })
  },
})

export const { clearError, setUser } = authSlice.actions
export default authSlice.reducer
