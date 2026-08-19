import { configureStore } from '@reduxjs/toolkit'
import appReducer from './slices/appSlice'
import orderReducer from './slices/orderSlice'

export const store = configureStore({
  reducer: {
    app: appReducer,
    order: orderReducer,
  },
})
