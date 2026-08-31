import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Home from './pages/Home';
import Orders from './pages/Orders';
import Earnings from './pages/Earnings';
import Profile from './pages/Profile';
import Tracking from './pages/Tracking';
import OrderComplete from './pages/OrderComplete';
import Login from './pages/Login';
import PersonalDetails from './pages/PersonalDetails';
import PaymentMethods from './pages/PaymentMethods';
import WalletPayouts from './pages/WalletPayouts';
import HelpCenter from './pages/HelpCenter';
import Notifications from './pages/Notifications';
import PrivacySafety from './pages/PrivacySafety';
import BottomNav from './components/BottomNav';
import { clearCompleted } from './store/slices/orderSlice';
import { useDeliverySocket } from './hooks/useDeliverySocket';
import { useGpsTracking } from './hooks/useGpsTracking';
import { usePartnerData } from './hooks/usePartnerData';
import { useLocationHeartbeat } from './hooks/useLocationHeartbeat';

// Pages that should show the bottom navigation
const navPages = ['/', '/orders', '/earnings', '/profile'];

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const location = useLocation();
  const partner = useSelector((s) => s.app.partner);
  const showNav = navPages.includes(location.pathname) && Boolean(partner);
  const dispatch = useDispatch();

  useDeliverySocket();
  useLocationHeartbeat();
  useGpsTracking();
  usePartnerData();

  // Reset completed state whenever leaving the complete screen
  useEffect(() => {
    if (location.pathname !== '/order-complete') {
      dispatch(clearCompleted());
    }
  }, [location.pathname, dispatch]);

  return (
    <div className="phone-shell bg-background text-on-background font-sans">
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={partner ? <Home /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/orders"
          element={partner ? <Orders /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/earnings"
          element={partner ? <Earnings /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile"
          element={partner ? <Profile /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile/personal-details"
          element={
            partner ? <PersonalDetails /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/profile/payment-methods"
          element={
            partner ? <PaymentMethods /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/profile/wallet-payouts"
          element={
            partner ? <WalletPayouts /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/profile/help-center"
          element={partner ? <HelpCenter /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile/notifications"
          element={
            partner ? <Notifications /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/profile/privacy-safety"
          element={
            partner ? <PrivacySafety /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/tracking"
          element={partner ? <Tracking /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/order-complete"
          element={
            partner ? <OrderComplete /> : <Navigate to="/login" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showNav && <BottomNav />}
    </div>
  );
}
