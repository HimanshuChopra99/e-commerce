import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { cartApi } from '../lib/api'
import { getSocket } from '../lib/socket'

const GUEST_CART_KEY = 'kick_guest_cart'
const MAX_QTY = 10

// Debounce cart:action socket events so rapid +/- clicks only fire 1 event
// once the user stops clicking (after 500ms of inactivity).
let _cartDebounceTimer = null
function notifyCartAction(lastAction, items) {
  try {
    const socket = getSocket()
    if (!socket?.connected) return

    const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0)
    const totalPrice = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (item.quantity || 1), 0)
    const summaryItems = items.map((item) => ({
      name: item.name,
      price: Number(item.price) || 0,
      quantity: item.quantity || 1,
      size: item.size || null,
      color: item.color || null,
    }))

    const payload = { lastAction, cartSummary: { totalItems, totalPrice, items: summaryItems } }

    if (_cartDebounceTimer) clearTimeout(_cartDebounceTimer)
    _cartDebounceTimer = setTimeout(() => {
      _cartDebounceTimer = null
      const s = getSocket()
      if (s?.connected) s.emit('cart:action', payload)
    }, 500)
  } catch {}
}

function loadGuestCart() {
  try {
    if (typeof window === 'undefined') return []
    // The old key was shared by every account. Never hydrate it into another
    // customer; account carts now come exclusively from the authenticated API.
    localStorage.removeItem('kick_cart')
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]')
  } catch {
    return []
  }
}

function saveGuestCart(items) {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items))
    }
  } catch {
    // Browsers can deny storage; the in-memory cart still works for this tab.
  }
}

function addLocal(items, payload) {
  const { variantId, productId, name, image, price, size, color, slug } = payload
  const id = variantId || `${productId}-${size}-${color}`
  if (items.some((item) => item.variantId === id)) return items
  return [
    ...items,
    {
      variantId: id,
      productId,
      name,
      image,
      price,
      size,
      color,
      slug,
      quantity: Math.min(payload.quantity || 1, MAX_QTY),
    },
  ]
}

export const hydrateCart = createAsyncThunk(
  'cart/hydrate',
  async (_, { getState, rejectWithValue }) => {
    const user = getState().auth.user
    if (!user) return { items: loadGuestCart(), userId: null }
    try {
      const guestItems = loadGuestCart()
      const response = guestItems.length
        ? await cartApi.sync(guestItems.map(({ variantId, quantity }) => ({ variantId, quantity })))
        : await cartApi.get()
      saveGuestCart([])
      return { items: response.data?.items || [], userId: user.id }
    } catch (error) {
      return rejectWithValue(error.message || 'Unable to load your cart.')
    }
  }
)

export const addToCart = createAsyncThunk(
  'cart/add',
  async (payload, { getState, rejectWithValue }) => {
    const { user } = getState().auth
    if (!user) {
      const items = addLocal(getState().cart.items, payload)
      saveGuestCart(items)
      return { items, userId: null }
    }
    try {
      const response = await cartApi.addItem(payload.variantId, payload.quantity || 1)
      return { items: response.data?.items || [], userId: user.id }
    } catch (error) {
      return rejectWithValue(error.message || 'Unable to add this item.')
    }
  }
)

export const updateQuantity = createAsyncThunk(
  'cart/updateQuantity',
  async ({ variantId, quantity }, { getState, rejectWithValue }) => {
    const capped = Math.min(Math.max(Number(quantity), 0), MAX_QTY)
    const { user } = getState().auth
    if (!user) {
      const items = capped === 0
        ? getState().cart.items.filter((item) => item.variantId !== variantId)
        : getState().cart.items.map((item) =>
          item.variantId === variantId ? { ...item, quantity: capped } : item)
      saveGuestCart(items)
      return { items, userId: null }
    }
    try {
      const response = capped === 0
        ? await cartApi.removeItem(variantId)
        : await cartApi.setItem(variantId, capped)
      return { items: response.data?.items || [], userId: user.id }
    } catch (error) {
      return rejectWithValue(error.message || 'Unable to update this item.')
    }
  }
)

export const removeFromCart = createAsyncThunk(
  'cart/remove',
  async (variantId, { getState, rejectWithValue }) => {
    const { user } = getState().auth
    if (!user) {
      const items = getState().cart.items.filter((item) => item.variantId !== variantId)
      saveGuestCart(items)
      return { items, userId: null }
    }
    try {
      const response = await cartApi.removeItem(variantId)
      return { items: response.data?.items || [], userId: user.id }
    } catch (error) {
      return rejectWithValue(error.message || 'Unable to remove this item.')
    }
  }
)

export const clearCart = createAsyncThunk(
  'cart/clear',
  async (_, { getState, rejectWithValue }) => {
    const { user } = getState().auth
    if (!user) {
      saveGuestCart([])
      return { items: [], userId: null }
    }
    try {
      const response = await cartApi.clear()
      return { items: response.data?.items || [], userId: user.id }
    } catch (error) {
      return rejectWithValue(error.message || 'Unable to clear your cart.')
    }
  }
)

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: loadGuestCart(),
    loading: false,
    initialized: false,
    syncedFor: null,
    error: null,
    rollbackItems: null,
  },
  reducers: {
    resetCartState: (state) => {
      state.items = []
      state.loading = false
      state.initialized = true
      state.syncedFor = null
      state.error = null
      state.rollbackItems = null
      saveGuestCart([])
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => {
      state.loading = true
      state.error = null
    }
    const fulfilled = (state, action) => {
      state.loading = false
      state.initialized = true
      state.items = action.payload.items
      state.syncedFor = action.payload.userId
      state.rollbackItems = null
    }
    const rejected = (state, action) => {
      state.loading = false
      state.error = action.payload || 'Cart request failed.'
    }
    const mutationRejected = (state, action) => {
      state.loading = false
      if (state.rollbackItems) state.items = state.rollbackItems
      state.rollbackItems = null
      state.error = action.payload || 'Cart request failed.'
    }

    builder
      .addCase(hydrateCart.pending, pending)
      .addCase(hydrateCart.fulfilled, fulfilled)
      .addCase(hydrateCart.rejected, rejected)
      .addCase(addToCart.pending, pending)
      .addCase(addToCart.fulfilled, (state, action) => {
        fulfilled(state, action)
        notifyCartAction(`Added ${action.meta?.arg?.name || 'item'} to cart`, action.payload.items)
      })
      .addCase(addToCart.rejected, rejected)
      .addCase(updateQuantity.pending, (state, action) => {
        pending(state)
        state.rollbackItems = state.items.map((item) => ({ ...item }))
        const { variantId, quantity } = action.meta.arg
        const capped = Math.min(Math.max(Number(quantity), 0), MAX_QTY)
        state.items = capped <= 0
          ? state.items.filter((item) => item.variantId !== variantId)
          : state.items.map((item) =>
            item.variantId === variantId ? { ...item, quantity: capped } : item)
      })
      .addCase(updateQuantity.fulfilled, (state, action) => {
        fulfilled(state, action)
        const qty = action.meta?.arg?.quantity
        notifyCartAction(`Updated cart item quantity to ${qty}`, action.payload.items)
      })
      .addCase(updateQuantity.rejected, mutationRejected)
      .addCase(removeFromCart.pending, (state, action) => {
        pending(state)
        state.rollbackItems = state.items.map((item) => ({ ...item }))
        state.items = state.items.filter((item) => item.variantId !== action.meta.arg)
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        fulfilled(state, action)
        notifyCartAction('Removed item from cart', action.payload.items)
      })
      .addCase(removeFromCart.rejected, mutationRejected)
      .addCase(clearCart.pending, pending)
      .addCase(clearCart.fulfilled, (state, action) => {
        fulfilled(state, action)
        notifyCartAction('Cleared cart', action.payload.items)
      })
      .addCase(clearCart.rejected, rejected)
  },
})

export const { resetCartState } = cartSlice.actions
export const selectCartItems = (state) => state.cart.items
export const selectCartCount = (state) => state.cart.items.length
export const selectCartQuantity = (state) =>
  state.cart.items.reduce((sum, item) => sum + item.quantity, 0)
export const selectCartTotal = (state) =>
  state.cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)

export default cartSlice.reducer
