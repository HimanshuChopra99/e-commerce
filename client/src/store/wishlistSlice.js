import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { favouritesApi } from '../lib/api';

export const fetchFavourites = createAsyncThunk(
  'wishlist/fetch',
  async (_, { getState, rejectWithValue }) => {
    const user = getState().auth.user;
    if (!user) return { products: [], userId: null };
    try {
      const response = await favouritesApi.get();
      return { products: response.data?.products || [], userId: user.id };
    } catch (error) {
      return rejectWithValue(error.message || 'Unable to load favourites.');
    }
  }
);

export const toggleWishlist = createAsyncThunk(
  'wishlist/toggle',
  async (productId, { getState, rejectWithValue }) => {
    const user = getState().auth.user;
    if (!user) return rejectWithValue('Sign in to save favourites.');
    const alreadySaved = getState().wishlist.ids.includes(productId);
    try {
      const response = alreadySaved
        ? await favouritesApi.remove(productId)
        : await favouritesApi.add(productId);
      return {
        products: response.data?.products || [],
        userId: user.id,
        saved: !alreadySaved,
      };
    } catch (error) {
      return rejectWithValue(error.message || 'Unable to update favourites.');
    }
  }
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    ids: [],
    products: [],
    loading: false,
    initialized: false,
    syncedFor: null,
    error: null,
  },
  reducers: {
    resetWishlistState: (state) => {
      state.ids = [];
      state.products = [];
      state.loading = false;
      state.initialized = true;
      state.syncedFor = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state) => {
      state.loading = true;
      state.error = null;
    };
    const fulfilled = (state, action) => {
      state.loading = false;
      state.initialized = true;
      state.products = action.payload.products;
      state.ids = action.payload.products.map(
        (product) => product.id || product.publicId
      );
      state.syncedFor = action.payload.userId;
    };
    const rejected = (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Favourite request failed.';
    };

    builder
      .addCase(fetchFavourites.pending, pending)
      .addCase(fetchFavourites.fulfilled, fulfilled)
      .addCase(fetchFavourites.rejected, rejected)
      .addCase(toggleWishlist.pending, pending)
      .addCase(toggleWishlist.fulfilled, fulfilled)
      .addCase(toggleWishlist.rejected, rejected);
  },
});

export const { resetWishlistState } = wishlistSlice.actions;
export const selectIsWishlisted = (id) => (state) =>
  Boolean(id && state.wishlist.ids.includes(id));
export const selectFavouriteProducts = (state) => state.wishlist.products;
export default wishlistSlice.reducer;
