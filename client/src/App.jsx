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

// Route-level code splitting: each page chunk is fetched lazily, so the first
// paint only downloads the code for the page the visitor actually opens.
const Home = lazy(() => import('./pages/Home'));
const Product = lazy(() => import('./pages/Product'));
const ProductView = lazy(() => import('./pages/ProductView'));
const Cart = lazy(() => import('./pages/Cart'));
const Payment = lazy(() => import('./pages/Payment'));
const Signup = lazy(() => import('./pages/Signup'));
const Login = lazy(() => import('./pages/Login'));
const Orders = lazy(() => import('./pages/Orders'));
const Profile = lazy(() => import('./pages/Profile'));
const Company = lazy(() => import('./pages/Company'));

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

function App() {
  const dispatch = useDispatch();
  const cartCount = useSelector(selectCartCount);
  const userId = useSelector((state) => state.auth.user?.id);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [toastQueue, setToastQueue] = useState([]);

  // Only the session identity and the guest/local cart are restored up-front.
  // Everything else (categories, featured products, orders, favourites) is
  // fetched lazily by the page that actually needs it — see Home, Product and
  // Profile. This avoids firing every API call on the very first page load.
  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  // Every authenticated account hydrates its database-backed cart so the
  // navbar count is correct everywhere. Favourites/orders are page-lazy.
  useEffect(() => {
    if (!userId) return;
    dispatch(hydrateCart());
  }, [dispatch, userId]);

  // Lock body scroll when any overlay/drawer is open
  useEffect(() => {
    if (isSearchOpen || isMobileOpen) {
      document.body.classList.add("locked");
    } else {
      document.body.classList.remove("locked");
    }
  }, [isSearchOpen, isMobileOpen]);

  // Global typed notifications. String details remain supported for older
  // callers, while new callers provide { message, type, title }.
  useEffect(() => {
    const enqueueToast = (event) => {
      const detail = event.detail;
      const notification = typeof detail === 'string'
        ? { message: detail, type: 'success' }
        : { message: detail?.message || 'Updated successfully.', type: detail?.type || 'success', title: detail?.title };
      setToastQueue((queue) => [
        ...queue.slice(-4),
        { id: Date.now() + Math.random(), ...notification },
      ]);
    };
    window.addEventListener('kick:toast', enqueueToast);
    return () => window.removeEventListener('kick:toast', enqueueToast);
  }, []);

  // Consume the queue one at a time
  const currentToast = toastQueue[0] || null;

  useEffect(() => {
    if (!currentToast) return;
    const timer = setTimeout(() => {
      setToastQueue((q) => q.filter((t) => t.id !== currentToast.id));
    }, currentToast.type === 'error' ? 4200 : 3200);
    return () => clearTimeout(timer);
  }, [currentToast]);

  const handleLinkSelect = (_label) => {
    // Navigation toast removed — was debug artifact
  };

  const handleSearchSelectProduct = (item) => {
    showToast(`Opening ${item.brand || ''} ${item.name || ''}`.trim(), 'info', { title: 'Product selected' });
  };

  const handleSearchSelectTag = (tag) => {
    showToast(`Showing products tagged #${tag}`, 'info', { title: 'Filter applied' });
  };

  return (
    <Router>
      <ScrollToTop />
      <AuthExpiredHandler />
      <div className="bg-[#EAE9E5] text-ink min-h-screen flex flex-col relative">
        {/* ===== 1. Site Header & Navbar ===== */}
        <Navbar
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenMobile={() => setIsMobileOpen(true)}
          onSelectLink={handleLinkSelect}
          cartCount={cartCount}
        />

        {/* ===== 2. Search Overlay ===== */}
        <SearchOverlay
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectProduct={handleSearchSelectProduct}
          onSelectTag={handleSearchSelectTag}
        />

        {/* ===== 3. Mobile Drawer ===== */}
        <MobileDrawer
          isOpen={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
          onSelectLink={handleLinkSelect}
        />

        {/* ===== 5. Global Toast Notification ===== */}
        {currentToast && (
          <Toast
            key={currentToast.id}
            toast={currentToast}
            onDismiss={() => setToastQueue((queue) => queue.filter((item) => item.id !== currentToast.id))}
          />
        )}

        {/* ===== Main Page Sections ===== */}
        <main className="flex-1 pt-20 md:pt-24 w-full">
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Product />} />
              <Route path="/product/:id" element={<ProductView />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout/payment" element={<Payment />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/about" element={<Company page="about" />} />
              <Route path="/contact" element={<Company page="contact" />} />
              <Route path="/blogs" element={<Company page="blogs" />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
        <AiAgentIcon />
      </div>
    </Router>
  );
}

export default App;
