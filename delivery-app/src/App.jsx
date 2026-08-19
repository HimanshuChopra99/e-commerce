import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import Home from './pages/Home'
import Orders from './pages/Orders'
import Earnings from './pages/Earnings'
import Profile from './pages/Profile'
import Tracking from './pages/Tracking'
import OrderComplete from './pages/OrderComplete'
import BottomNav from './components/BottomNav'
import { clearCompleted } from './store/slices/orderSlice'

// Pages that should show the bottom navigation
const navPages = ['/', '/orders', '/earnings', '/profile']

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  const location = useLocation()
  const showNav = navPages.includes(location.pathname)
  const dispatch = useDispatch()

  // Reset completed state whenever leaving the complete screen
  useEffect(() => {
    if (location.pathname !== '/order-complete') {
      dispatch(clearCompleted())
    }
  }, [location.pathname, dispatch])

  return (
    <div className="phone-shell bg-background text-on-background font-sans">
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/earnings" element={<Earnings />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/order-complete" element={<OrderComplete />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showNav && <BottomNav />}
    </div>
  )
}
