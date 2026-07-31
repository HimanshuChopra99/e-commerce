import { configureStore } from '@reduxjs/toolkit'
import adminAuthReducer from './adminAuthSlice'
import adminDashboardReducer from './adminDashboardSlice'
import adminProductsReducer from './adminProductsSlice'
import adminOrdersReducer from './adminOrdersSlice'
import adminCustomersReducer from './adminCustomersSlice'
import adminCategoriesReducer from './adminCategoriesSlice'

export const store = configureStore({
  reducer: {
    adminAuth: adminAuthReducer,
    adminDashboard: adminDashboardReducer,
    adminProducts: adminProductsReducer,
    adminOrders: adminOrdersReducer,
    adminCustomers: adminCustomersReducer,
    adminCategories: adminCategoriesReducer,
  },
})

export default store
