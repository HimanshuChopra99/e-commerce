import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import productsReducer from './productsSlice'
import categoriesReducer from './categoriesSlice'
import cartReducer from './cartSlice'
import ordersReducer from './ordersSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    categories: categoriesReducer,
    cart: cartReducer,
    orders: ordersReducer,
  },
})

export default store
