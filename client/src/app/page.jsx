"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SearchOverlay from "@/components/SearchOverlay";
import MobileDrawer from "@/components/MobileDrawer";
import CartDrawer from "@/components/CartDrawer";
import Toast from "@/components/Toast";
import { Search, ShoppingBag, Menu, CheckCircle2, Sparkles } from "lucide-react";

export default function HomePage() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [cartCount, setCartCount] = useState(2);
  const [toastMessage, setToastMessage] = useState(null);
  const [lastSelectedLink, setLastSelectedLink] = useState("None (Try clicking a menu item)");

  // Lock body scroll when any overlay is open
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
    setLastSelectedLink(label);
    triggerToast(`Navigated to: ${label}`);
  };

  const handleSearchSelectProduct = (item) => {
    setCartCount((c) => c + 1);
    setLastSelectedLink(`Selected "${item.brand} ${item.name}" from search`);
    triggerToast(`Added ${item.brand} ${item.name} to cart`);
  };

  const handleSearchSelectTag = (tag) => {
    setLastSelectedLink(`Search tag: #${tag}`);
    triggerToast(`Filtered by tag: #${tag}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      {/* ============================================================
           1. SITE NAVBAR (With Men & Women Mega Menu Dropdowns)
      ============================================================ */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenMobile={() => setIsMobileOpen(true)}
        onSelectLink={handleLinkSelect}
        cartCount={cartCount}
      />

      {/* ============================================================
           2. SEARCH OVERLAY COMPONENT
      ============================================================ */}
      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={handleSearchSelectProduct}
        onSelectTag={handleSearchSelectTag}
      />

      {/* ============================================================
           3. MOBILE DRAWER COMPONENT
      ============================================================ */}
      <MobileDrawer
        isOpen={isMobileOpen}
        onClose={() => setIsMobileOpen(false)}
        onSelectLink={handleLinkSelect}
      />

      {/* ============================================================
           4. CART DRAWER COMPONENT
      ============================================================ */}
      {/* <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCartCountChange={(c) => setCartCount(c)}
        onCheckoutClick={(subtotal) => {
          triggerToast(`Proceeding to checkout ($${subtotal.toFixed(2)})`);
        }}
      /> */}

      {/* ============================================================
           5. TOAST NOTIFICATION COMPONENT
      ============================================================ */}
      <Toast isOpen={!!toastMessage} message={toastMessage || ""} />

      {/* ============================================================
           6. COMPONENT DESIGN SHOWCASE / PLAYGROUND CANVAS
           (Not a full website — focused purely on the Navbar & related design components)
      ============================================================ */}
      <main className="pt-24 md:pt-32 pb-20 px-4 sm:px-6 lg:px-10 max-w-[1240px] mx-auto w-full">
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-black/5 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-paper text-xs font-bold uppercase tracking-widest text-neutral-600 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-branddark" />
            Pure UI Design Components (JSX) · Zero Context/Redux
          </div>
          <h1 className="font-display text-3xl sm:text-5xl tracking-tight leading-tight">
            KICKS NAVBAR &amp; HEADER DESIGN
          </h1>
          <p className="mt-3 text-neutral-500 max-w-2xl text-base font-medium">
            This workspace showcases the standalone <strong>Navbar</strong> with its interactive{" "}
            <strong>Men</strong> &amp; <strong>Women</strong> Mega Menu dropdown panels, animated
            nav-link underline sweeps, and its accompanying header modals (
            <strong>Search Overlay</strong>, <strong>Cart Drawer</strong>, <strong>Mobile Menu</strong>
            , and <strong>Toast</strong>) built as pure JSX components.
          </p>

          {/* Interactive Trigger Shortcuts for checking the Design */}
          <div className="mt-8 pt-8 border-t border-black/5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center justify-between p-5 rounded-2xl bg-paper hover:bg-ink hover:text-white transition-colors group text-left"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 group-hover:text-neutral-300">
                  Header Modal #1
                </p>
                <p className="font-bold text-base mt-1 flex items-center gap-2">
                  Open Search Overlay
                  <Search className="w-4 h-4" />
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white text-ink shadow-sm">
                Live Search
              </span>
            </button>

            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center justify-between p-5 rounded-2xl bg-paper hover:bg-ink hover:text-white transition-colors group text-left"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 group-hover:text-neutral-300">
                  Header Modal #2
                </p>
                <p className="font-bold text-base mt-1 flex items-center gap-2">
                  Open Cart Drawer
                  <ShoppingBag className="w-4 h-4" />
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand text-ink shadow-sm">
                {cartCount} items
              </span>
            </button>

            <button
              onClick={() => setIsMobileOpen(true)}
              className="flex items-center justify-between p-5 rounded-2xl bg-paper hover:bg-ink hover:text-white transition-colors group text-left"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 group-hover:text-neutral-300">
                  Header Modal #3
                </p>
                <p className="font-bold text-base mt-1 flex items-center gap-2">
                  Open Mobile Menu
                  <Menu className="w-4 h-4" />
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-white text-ink shadow-sm">
                Drawer Left
              </span>
            </button>
          </div>
        </div>

        {/* Status indicator showing which menu item or category was clicked */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-black/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                Active Menu Action
              </p>
              <p className="font-bold text-base sm:text-lg text-ink mt-0.5">
                {lastSelectedLink}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLastSelectedLink("None (Try clicking a menu item)")}
            className="text-xs font-bold px-4 py-2 rounded-full bg-paper hover:bg-neutral-200 transition-colors"
          >
            Reset Action State
          </button>
        </div>
      </main>
    </div>
  );
}
