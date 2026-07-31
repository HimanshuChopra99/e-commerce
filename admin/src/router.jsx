import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { ProtectedRoute } from '@/components/protected-route'
import { AdminLoginPage } from '@/features/auth/login-page'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { ProductsPage } from '@/features/products/products-page'
import { ProductNewPage } from '@/features/products/product-new-page'
import { ProductEditPage } from '@/features/products/product-edit-page'
import { ProductDetailPage } from '@/features/products/product-detail-page'
import { OrdersPage } from '@/features/orders/orders-page'
import { OrderDetailPage } from '@/features/orders/order-detail-page'
import { CustomersPage } from '@/features/customers/customers-page'
import { CustomerDetailPage } from '@/features/customers/customer-detail-page'
import { CategoriesPage } from '@/features/categories/categories-page'
import { CategoryDetailPage } from '@/features/categories/category-detail-page'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AdminLoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        errorElement: <GeneralError />,
        children: [
          { index: true, element: <DashboardPage /> },

          { path: 'products', element: <ProductsPage /> },
          { path: 'products/new', element: <ProductNewPage /> },
          { path: 'products/:productId', element: <ProductDetailPage /> },
          { path: 'products/:productId/edit', element: <ProductEditPage /> },

          { path: 'orders', element: <OrdersPage /> },
          { path: 'orders/:orderId', element: <OrderDetailPage /> },

          { path: 'customers', element: <CustomersPage /> },
          { path: 'customers/:customerId', element: <CustomerDetailPage /> },

          { path: 'categories', element: <CategoriesPage /> },
          { path: 'categories/:categoryId', element: <CategoryDetailPage /> },

          { path: '*', element: <NotFoundError /> },
        ],
      },
    ],
  },
])
