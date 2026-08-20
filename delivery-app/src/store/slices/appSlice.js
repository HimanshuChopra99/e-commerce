import { createSlice } from '@reduxjs/toolkit'

const STORAGE_KEY = 'dp_auth'

function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { partner: null, token: null }
    return JSON.parse(raw)
  } catch {
    return { partner: null, token: null }
  }
}

function saveAuth(partner, token) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ partner, token }))
  } catch {}
}

function clearAuth() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}

const persisted = loadAuth()

const initialState = {
  online: false,
  partner: persisted.partner ?? null,  // { id, publicId, firstName, lastName, email, vehicleType }
  token: persisted.token ?? null,       // JWT access token
  authLoading: false,
  authError: null,
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setOnline: (state, action) => {
      state.online = action.payload
    },
    loginSuccess: (state, action) => {
      state.partner = action.payload.partner
      state.token = action.payload.accessToken
      state.authError = null
      saveAuth(action.payload.partner, action.payload.accessToken)
    },
    logout: (state) => {
      state.partner = null
      state.token = null
      state.online = false
      clearAuth()
    },
    setAuthError: (state, action) => {
      state.authError = action.payload
    },
    setAuthLoading: (state, action) => {
      state.authLoading = action.payload
    },
  },
})

export const { setOnline, loginSuccess, logout, setAuthError, setAuthLoading } = appSlice.actions
export default appSlice.reducer
