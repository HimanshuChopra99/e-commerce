const BASE_URL = import.meta.env.VITE_API_URL || '/api'

let accessToken = typeof window !== 'undefined' ? localStorage.getItem('kick_admin_access_token') : null

export function setAccessToken(token) {
  accessToken = token
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('kick_admin_access_token', token)
    } else {
      localStorage.removeItem('kick_admin_access_token')
    }
  }
}

export function getAccessToken() {
  return accessToken
}

async function request(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
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
    throw new Error(data?.error?.message || data?.message || (typeof data?.error === 'string' ? data.error : '') || 'Request failed')
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
const postForm = (path, body) => request(path, { method: 'POST', body })
const patch = (path, body) => request(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
const del = (path) => request(path, { method: 'DELETE' })

export const adminAuthApi = {
  login: (credentials) => post('/auth/login', credentials),
  me: () => get('/auth/me'),
  logout: () => post('/auth/logout'),
}

export const adminDashboardApi = {
  getOverview: () => get('/admin/dashboard/overview'),
  getSalesChart: (period = 'month') => get('/admin/dashboard/revenue', { months: period === 'year' ? 12 : 6 }),
  getRecentOrders: (limit = 5) => get(`/admin/dashboard/recent-orders?limit=${limit}`),
  getTopProducts: (limit = 5) => get(`/admin/dashboard/top-products?limit=${limit}`),
}

export const adminProductsApi = {
  list: (params) => get('/admin/products', params),
  getOne: (id) => get(`/admin/products/${id}`),
  create: (body) => post('/admin/products', body),
  update: (id, body) => patch(`/admin/products/${id}`, body),
  uploadImages: (files) => {
    const body = new FormData()
    files.forEach((file) => body.append('images', file))
    return postForm('/admin/products/image-uploads', body)
  },
  delete: (id) => del(`/admin/products/${id}`),
  bulkStatus: (productIds, status) => post('/admin/products/bulk-status', { productIds, status }),
  bulkDelete: (productIds) => post('/admin/products/bulk-delete', { productIds }),
}

export const adminCategoriesApi = {
  list: () => get('/admin/categories'),
  getOne: (id) => get(`/admin/categories/${id}`),
  create: (body) => post('/admin/categories', body),
  update: (id, body) => patch(`/admin/categories/${id}`, body),
  delete: (id) => del(`/admin/categories/${id}`),
  assignProducts: (id, productIds) => post(`/admin/categories/${id}/products`, { productIds }),
  removeProduct: (id, productId) => del(`/admin/categories/${id}/products/${productId}`),
}

export const adminOrdersApi = {
  list: (params) => get('/admin/orders', params),
  getOne: (id) => get(`/admin/orders/${id}`),
  updateStatus: (id, status) => patch(`/admin/orders/${id}/status`, { status }),
}

export const adminCustomersApi = {
  list: (params) => get('/admin/customers', params),
  getOne: (id) => get(`/admin/customers/${id}`),
}
