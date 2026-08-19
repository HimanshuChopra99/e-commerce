import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  online: false,
}

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setOnline: (state, action) => {
      state.online = action.payload
    },
  },
})

export const { setOnline } = appSlice.actions
export default appSlice.reducer
