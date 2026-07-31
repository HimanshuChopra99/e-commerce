const BASE_URL = import.meta.env.VITE_API_URL || '/api'

let accessToken = typeof window !== 'undefined' ? localStorage.getItem('kick_access_token') : null

export function setAccessToken(token) {
  accessToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('kick_access_token', token)
    } else {
      localStorage.removeItem('kick_access_token')
    }
  }
}

export function getAccessToken() {
  return accessToken
}

async function request(path, options = {}) {
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

  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshed = await silentRefresh()
    if (refreshed) {
      return request(path, options)
    }
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.message || data.error || 'Request failed')
  }

  return data
}

async function silentRefresh() {
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
    return false
  } catch {
    return false
  }
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
  cancel: (id) => post(`/orders/${id}/cancel`),
}
