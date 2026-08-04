import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from './store/authSlice';
import { fetchCategories } from './store/categoriesSlice';
import { hydrateCart, selectCartCount } from './store/cartSlice';
import { fetchFavourites } from './store/wishlistSlice';
import { showToast } from './lib/toast';

import Navbar from './components/common/Navbar';
import SearchOverlay from './components/common/SearchOverlay';
import MobileDrawer from './components/common/MobileDrawer';
import Toast from './components/common/Toast';
import Footer from './components/common/Footer';
import AuthExpiredHandler from './components/AuthExpiredHandler';
import Home from './pages/Home';
import Product from './pages/Product';
import ProductView from './pages/ProductView';
import Cart from './pages/Cart';
import Payment from './pages/Payment';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import Company from './pages/Company';

function App() {
  const dispatch = useDispatch();
  const cartCount = useSelector(selectCartCount);
  const userId = useSelector((state) => state.auth.user?.id);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [toastQueue, setToastQueue] = useState([]);

  useEffect(() => {
    dispatch(fetchMe());
    dispatch(fetchCategories());
  }, [dispatch]);

  // Every authenticated account hydrates its own database-backed state. Guest
  // cart lines are merged once, then removed from browser storage.
  useEffect(() => {
    if (!userId) return;
    dispatch(hydrateCart());
    dispatch(fetchFavourites());
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
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
