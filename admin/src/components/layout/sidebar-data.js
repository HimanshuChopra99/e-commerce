import {
  LayoutDashboard,
  Footprints,
  ShoppingCart,
  Users,
  LayoutGrid,
  Bike,
} from 'lucide-react'

/**
 * The sidebar links.
 *
 * 👉 To add a page to the menu, add an item here and a matching route in
 *    `src/router.jsx`.
 */
export const navGroups = [
  {
    title: 'Store',
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard },
      { title: 'Products', url: '/products', icon: Footprints },
      { title: 'Orders', url: '/orders', icon: ShoppingCart },
      { title: 'Customers', url: '/customers', icon: Users },
      { title: 'Categories', url: '/categories', icon: LayoutGrid },
      { title: 'Delivery Partners', url: '/delivery-partners', icon: Bike },
    ],
  },
]
