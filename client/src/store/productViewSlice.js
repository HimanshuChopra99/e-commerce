import { createSlice } from '@reduxjs/toolkit'

/**
 * Product detail page selection (color/size).
 *
 * This slice is the bridge between the global voice-command socket listener
 * (useVoiceCommands) and the ProductView page, mirroring how cart/wishlist
 * commands flow through the store. The selection is stored as the product's
 * canonical values ("Red", "10") keyed by product slug, so a voice command
 * can never leak a color/size onto a different product.
 *
 * ProductView derives the rich display objects (hex swatch, gallery images,
 * US/UK conversions) from these values via useMemo — the store stays small
 * and plain.
 */
const initialState = {
  slug: null,  // product slug this selection belongs to
  color: null, // canonical color name as stored on the product (e.g. "Red")
  size: null,  // canonical size value as stored on the product (e.g. "10")
}

const productViewSlice = createSlice({
  name: 'productView',
  initialState,
  reducers: {
    /**
     * Set (or merge) the selected color/size for a product.
     * Clicks and voice commands both go through this single action.
     */
    selectVariant(state, action) {
      const { slug, color, size } = action.payload || {}

      // A command for a different product starts a fresh selection — never
      // merge another product's color/size into the current one.
      if (slug && slug !== state.slug) {
        state.slug = slug
        state.color = color !== undefined && color !== null && color !== '' ? String(color) : null
        state.size = size !== undefined && size !== null && size !== '' ? String(size) : null
        return
      }

      if (slug) state.slug = slug
      if (color !== undefined) state.color = color !== null && color !== '' ? String(color) : null
      if (size !== undefined) state.size = size !== null && size !== '' ? String(size) : null
    },
  },
})

export const { selectVariant } = productViewSlice.actions

export const selectProductView = (state) => state.productView

export default productViewSlice.reducer
