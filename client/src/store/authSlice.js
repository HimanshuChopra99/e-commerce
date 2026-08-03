import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authApi, setAccessToken } from '../lib/api'
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
    const res = await authApi.me()
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
