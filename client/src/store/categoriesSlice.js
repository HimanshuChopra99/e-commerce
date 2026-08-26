import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { categoriesApi } from '../lib/api';

export const fetchCategories = createAsyncThunk(
  'categories/list',
  async (_, { rejectWithValue }) => {
    try {
      const res = await categoriesApi.list();
      return res.data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch categories');
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState().categories;
      return !state.loading && state.items.length === 0;
    },
  }
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (s) => {
        s.loading = true;
      })
      .addCase(fetchCategories.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload || [];
      })
      .addCase(fetchCategories.rejected, (s, a) => {
        s.loading = false;
        s.error = a.payload;
      });
  },
});

export default categoriesSlice.reducer;
