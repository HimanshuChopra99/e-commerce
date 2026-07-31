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
import Home from './pages/Home';
import Product from './pages/Product';
import ProductView from './pages/ProductView';
import Cart from './pages/Cart';
import Signup from './pages/SIgnup';
import Login from './pages/Login';
import Orders from './pages/Orders';

function App() {
  const dispatch = useDispatch();
  const cartCount = useSelector(selectCartCount);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

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

  // Auto-hide toast after 2.4s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
  };

  const handleLinkSelect = (label) => {
    triggerToast(`Navigated to: ${label}`);
  };

  const handleSearchSelectProduct = (item) => {
    triggerToast(`Selected ${item.brand || ''} ${item.name || ''}`);
  };

  const handleSearchSelectTag = (tag) => {
    triggerToast(`Filtered by tag: #${tag}`);
  };

  return (
    <Router>
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
        <Toast isOpen={!!toastMessage} message={toastMessage || ""} />

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
