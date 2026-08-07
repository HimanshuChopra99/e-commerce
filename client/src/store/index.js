import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import productsReducer from './productsSlice'
import categoriesReducer from './categoriesSlice'
import cartReducer from './cartSlice'
import ordersReducer from './ordersSlice'
import wishlistReducer from './wishlistSlice'
import productViewReducer from './productViewSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    categories: categoriesReducer,
    cart: cartReducer,
    orders: ordersReducer,
    wishlist: wishlistReducer,
    productView: productViewReducer,
  },
})

export default store
