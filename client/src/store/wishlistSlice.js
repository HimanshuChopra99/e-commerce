import { createSlice } from '@reduxjs/toolkit'

const load = () => {
  try {
    return JSON.parse(localStorage.getItem('kick_wishlist') || '[]')
  } catch {
    return []
  }
}

const save = (ids) => {
  try {
    localStorage.setItem('kick_wishlist', JSON.stringify(ids))
  } catch {}
}

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { ids: load() },
  reducers: {
    toggleWishlist: (state, action) => {
      const id = action.payload
      const idx = state.ids.indexOf(id)
      if (idx >= 0) {
        state.ids.splice(idx, 1)
      } else {
        state.ids.push(id)
      }
      save(state.ids)
    },
  },
})

export const { toggleWishlist } = wishlistSlice.actions
export const selectIsWishlisted = (id) => (state) => Boolean(id && state.wishlist?.ids?.includes(id))
export default wishlistSlice.reducer
