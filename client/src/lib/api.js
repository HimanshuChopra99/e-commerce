const BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Access tokens live in memory only — never in localStorage or cookies.
// They are re-issued from the HttpOnly refresh cookie on every page load.
let accessToken = null

export function setAccessToken(token) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

let refreshPromise = null

async function _doRefresh() {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    const data = await res.json()
    if (data?.data?.accessToken) {
      setAccessToken(data.data.accessToken)
      return true
    }
    setAccessToken(null)
    return false
  } catch {
    setAccessToken(null)
    return false
  }
}

// Exported so authSlice.fetchMe can silently restore the token on boot.
export function silentRefresh() {
  if (refreshPromise) return refreshPromise
  refreshPromise = _doRefresh().finally(() => { refreshPromise = null })
  return refreshPromise
}

async function request(path, options = {}, retriedAfterRefresh = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  })

  // Access tokens are intentionally memory-only. After a browser refresh the
  // first protected request is /auth/me, so it must be allowed to use the
  // HttpOnly refresh cookie to obtain a new access token. Excluding /auth/me
  // here caused every page reload to look like a logout.
  if (
    res.status === 401 &&
    !retriedAfterRefresh &&
    path !== '/auth/refresh' &&
    path !== '/auth/login'
  ) {
    const refreshed = await silentRefresh()
    if (refreshed) {
      return request(path, options, true)
    }
  }

  // Only notify the application after a refresh attempt has failed (or after
  // the newly refreshed token was rejected). A normal initial /auth/me request
  // can therefore restore the session from the HttpOnly refresh cookie after a
  // page reload instead of treating the user as logged out.
  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    window.dispatchEvent(new CustomEvent('kick:auth:expired'))
    throw new Error('Your session has expired. Please sign in again.')
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data?.error?.message || data?.message || (typeof data?.error === 'string' ? data.error : '') || 'Request failed')
  }

  return data
}

const get = (path, params) => {
  if (params) {
    const cleanParams = {}
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        cleanParams[k] = v
      }
    })
    const queryStr = new URLSearchParams(cleanParams).toString()
    return request(queryStr ? `${path}?${queryStr}` : path)
  }
  return request(path)
}

const post = (path, body) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
const patch = (path, body) => request(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
const del = (path) => request(path, { method: 'DELETE' })

export const authApi = {
  register: (body) => post('/auth/register', body),
  login: (body) => post('/auth/login', body),
  logout: () => post('/auth/logout'),
  me: () => get('/auth/me'),
  refresh: () => post('/auth/refresh'),
  updateMe: (body) => patch('/auth/me', body),
  changePassword: (body) => post('/auth/change-password', body),
}

export const productsApi = {
  list: (params) => get('/products', params),
  featured: (limit = 8) => get('/products/featured', { limit }),
  filters: () => get('/products/filters'),
  getBySlug: (slug) => get(`/products/${slug}`),
  related: (slug) => get(`/products/${slug}/related`),
}

export const categoriesApi = {
  list: () => get('/categories'),
  getBySlug: (slug) => get(`/categories/${slug}`),
}

export const ordersApi = {
  quote: (body) => post('/orders/quote', body),
  create: (body) => post('/orders', body),
  listMine: () => get('/orders'),
  getOne: (id) => get(`/orders/${id}`),
  paymentStatus: (id) => get(`/orders/${id}/payment-status`),
  pay: (id) => post(`/orders/${id}/pay`),
  cancel: (id) => post(`/orders/${id}/cancel`),
}
