import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from './store/authSlice';
import { fetchCategories } from './store/categoriesSlice';
import { selectCartCount } from './store/cartSlice';

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
import Signup from './pages/Signup';
import Login from './pages/Login';
import Orders from './pages/Orders';

function App() {
  const dispatch = useDispatch();
  const cartCount = useSelector(selectCartCount);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [toastQueue, setToastQueue] = useState([]);

  useEffect(() => {
    dispatch(fetchMe());
    dispatch(fetchCategories());
  }, [dispatch]);

  // Lock body scroll when any overlay/drawer is open
  useEffect(() => {
    if (isSearchOpen || isCartOpen || isMobileOpen) {
      document.body.classList.add("locked");
    } else {
      document.body.classList.remove("locked");
    }
  }, [isSearchOpen, isCartOpen, isMobileOpen]);

  // Listen for toast events
  useEffect(() => {
    const showToast = (event) =>
      setToastQueue((q) => [...q, { id: Date.now() + Math.random(), message: event.detail || 'Updated successfully.' }]);
    window.addEventListener('kick:toast', showToast);
    return () => window.removeEventListener('kick:toast', showToast);
  }, []);

  // Consume the queue one at a time
  const currentToast = toastQueue[0] || null;

  useEffect(() => {
    if (!currentToast) return;
    const timer = setTimeout(() => {
      setToastQueue((q) => q.filter((t) => t.id !== currentToast.id));
    }, 2400);
    return () => clearTimeout(timer);
  }, [currentToast]);

  const handleLinkSelect = (_label) => {
    // Navigation toast removed — was debug artifact
  };

  const handleSearchSelectProduct = (item) => {
    window.dispatchEvent(new CustomEvent('kick:toast', { detail: `Selected ${item.brand || ''} ${item.name || ''}` }));
  };

  const handleSearchSelectTag = (tag) => {
    window.dispatchEvent(new CustomEvent('kick:toast', { detail: `Filtered by tag: #${tag}` }));
  };

  return (
    <Router>
      <AuthExpiredHandler />
      <div className="bg-[#EAE9E5] text-ink min-h-screen flex flex-col relative">
        {/* ===== 1. Site Header & Navbar ===== */}
        <Navbar
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenCart={() => setIsCartOpen(true)}
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

        {/* ===== 5. Toast Notification ===== */}
        <Toast isOpen={!!currentToast} message={currentToast?.message || ""} />

        {/* ===== Main Page Sections ===== */}
        <main className="flex-1 pt-20 md:pt-24 w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Product />} />
            <Route path="/product/:id" element={<ProductView />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/orders" element={<Orders />} />
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
