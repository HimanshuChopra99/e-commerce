import { createSlice } from '@reduxjs/toolkit'

const loadCart = () => {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('kick_cart')
      return raw ? JSON.parse(raw) : []
    }
    return []
  } catch {
    return []
  }
}

const saveCart = (items) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('kick_cart', JSON.stringify(items))
    }
  } catch {
    // Ignore storage errors
  }
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: loadCart() },
  reducers: {
    addToCart: (state, action) => {
      const { variantId, productId, name, image, price, size, color, slug } = action.payload
      const idToMatch = variantId || `${productId}-${size}-${color}`
      const existing = state.items.find((i) => (i.variantId || `${i.productId}-${i.size}-${i.color}`) === idToMatch)
      if (existing) {
        existing.quantity += action.payload.quantity || 1
      } else {
        state.items.push({
          variantId: idToMatch,
          productId,
          name,
          image,
          price,
          size,
          color,
          slug,
          quantity: action.payload.quantity || 1,
        })
      }
      saveCart(state.items)
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter((i) => i.variantId !== action.payload)
      saveCart(state.items)
    },
    updateQuantity: (state, action) => {
      const { variantId, quantity } = action.payload
      const item = state.items.find((i) => i.variantId === variantId)
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter((i) => i.variantId !== variantId)
        } else {
          item.quantity = quantity
        }
      }
      saveCart(state.items)
    },
    clearCart: (state) => {
      state.items = []
      saveCart([])
    },
  },
})

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions

export const selectCartItems = (state) => state.cart.items
export const selectCartCount = (state) => state.cart.items.reduce((s, i) => s + i.quantity, 0)
export const selectCartTotal = (state) =>
  state.cart.items.reduce((s, i) => s + i.price * i.quantity, 0)

export default cartSlice.reducer
