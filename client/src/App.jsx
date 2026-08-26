import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from './store/authSlice';
import { hydrateCart, selectCartCount } from './store/cartSlice';
import { showToast } from './lib/toast';

import Navbar from './components/common/Navbar';
import SearchOverlay from './components/common/SearchOverlay';
import MobileDrawer from './components/common/MobileDrawer';
import Toast from './components/common/Toast';
import Footer from './components/common/Footer';
import AuthExpiredHandler from './components/AuthExpiredHandler';
import ScrollToTop from './components/common/ScrollToTop';
import AiAgentIcon from './components/common/AiAgentIcon';
import { usePageTracker } from './hooks/usePageTracker';

function PageTracker() {
  usePageTracker();
  return null;
}

const Home = lazy(() => import('./pages/Home'));
const Product = lazy(() => import('./pages/Product'));
const ProductView = lazy(() => import('./pages/ProductView'));
const Cart = lazy(() => import('./pages/Cart'));
const Payment = lazy(() => import('./pages/Payment'));
const Signup = lazy(() => import('./pages/Signup'));
const Login = lazy(() => import('./pages/Login'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Company = lazy(() => import('./pages/Company'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));

function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#EAE9E5] flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#1E1E1E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-bold text-gray-500">Loading…</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const dispatch = useDispatch();
  const cartCount = useSelector(selectCartCount);
  const userId = useSelector((state) => state.auth.user?.id);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [toastQueue, setToastQueue] = useState([]);

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  useEffect(() => {
    if (!userId) return;
    dispatch(hydrateCart());
  }, [dispatch, userId]);

  useEffect(() => {
    if (isSearchOpen || isMobileOpen) {
      document.body.classList.add('locked');
    } else {
      document.body.classList.remove('locked');
    }
  }, [isSearchOpen, isMobileOpen]);

  useEffect(() => {
    const enqueueToast = (event) => {
      const detail = event.detail;
      const notification =
        typeof detail === 'string'
          ? { message: detail, type: 'success' }
          : {
              message: detail?.message || 'Updated successfully.',
              type: detail?.type || 'success',
              title: detail?.title,
            };
      setToastQueue((queue) => [
        ...queue.slice(-4),
        { id: Date.now() + Math.random(), ...notification },
      ]);
    };
    window.addEventListener('kick:toast', enqueueToast);
    return () => window.removeEventListener('kick:toast', enqueueToast);
  }, []);

  const currentToast = toastQueue[0] || null;

  useEffect(() => {
    if (!currentToast) return;
    const timer = setTimeout(
      () => {
        setToastQueue((q) => q.filter((t) => t.id !== currentToast.id));
      },
      currentToast.type === 'error' ? 4200 : 3200
    );
    return () => clearTimeout(timer);
  }, [currentToast]);

  const handleLinkSelect = () => {};

  const handleSearchSelectProduct = (item) => {
    showToast(`Opening ${item.brand || ''} ${item.name || ''}`.trim(), 'info', {
      title: 'Product selected',
    });
  };

  const handleSearchSelectTag = (tag) => {
    showToast(`Showing products tagged #${tag}`, 'info', {
      title: 'Filter applied',
    });
  };

  return (
    <>
      <ScrollToTop />
      <PageTracker />
      <AuthExpiredHandler />

      <Routes>
        {/* ── Fullscreen standalone route — no Navbar / Footer / padding ── */}
        <Route
          path="/track/:trackingNumber"
          element={
            <Suspense fallback={<RouteFallback />}>
              <TrackOrder />
            </Suspense>
          }
        />

        {/* ── All other routes — normal layout with Navbar & Footer ── */}
        <Route
          path="*"
          element={
            <div className="bg-[#EAE9E5] text-ink min-h-screen flex flex-col relative">
              <Navbar
                onOpenSearch={() => setIsSearchOpen(true)}
                onOpenMobile={() => setIsMobileOpen(true)}
                onSelectLink={handleLinkSelect}
                cartCount={cartCount}
              />

              <SearchOverlay
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSelectProduct={handleSearchSelectProduct}
                onSelectTag={handleSearchSelectTag}
              />

              <MobileDrawer
                isOpen={isMobileOpen}
                onClose={() => setIsMobileOpen(false)}
                onSelectLink={handleLinkSelect}
              />

              {currentToast && (
                <Toast
                  key={currentToast.id}
                  toast={currentToast}
                  onDismiss={() =>
                    setToastQueue((queue) =>
                      queue.filter((item) => item.id !== currentToast.id)
                    )
                  }
                />
              )}

              <main className="flex-1 pt-20 md:pt-24 w-full">
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<Product />} />
                    <Route path="/product/:id" element={<ProductView />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout/payment" element={<Payment />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/orders/:id" element={<OrderDetail />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/about" element={<Company page="about" />} />
                    <Route
                      path="/contact"
                      element={<Company page="contact" />}
                    />
                    <Route path="/blogs" element={<Company page="blogs" />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                  </Routes>
                </Suspense>
              </main>

              <Footer />
              <AiAgentIcon />
            </div>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
