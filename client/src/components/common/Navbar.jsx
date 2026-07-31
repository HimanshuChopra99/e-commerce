import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../store/authSlice";
import { ChevronDown, Search, User, ShoppingBag, Menu, ArrowRight, LogOut, Package } from "lucide-react";

export default function Navbar({
  onOpenSearch,
  onOpenCart,
  onOpenMobile,
  onSelectLink,
  cartCount = 0,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [scrolled, setScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownTimerRef = useRef(null);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false); // scrolling down
      } else {
        setIsVisible(true); // scrolling up
      }
      
      setLastScrollY(currentScrollY);
      setScrolled(currentScrollY > 8);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleMouseEnter = (menu) => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) return;
    if (dropdownTimerRef.current) clearTimeout(dropdownTimerRef.current);
    setOpenDropdown(menu);
  };

  const handleMouseLeave = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) return;
    dropdownTimerRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 160);
  };

  const handleLinkClick = (label) => {
    setOpenDropdown(null);
    if (onSelectLink) {
      onSelectLink(label);
    }
  };

  return (
    <header
      id="site-header"
      className={`fixed w-[95%] lg:w-[90%] max-w-[1280px] rounded-2xl mx-auto inset-x-0 z-50 bg-white transition-all duration-300 ease-in-out shadow-sm border border-black/5 ${
        scrolled ? "shadow-md" : ""
      } ${isVisible ? "top-4 lg:top-6 translate-y-0" : "-top-24 -translate-y-full"}`}
    >
      <nav className="relative mx-auto max-w-[1280px] w-full h-16 md:h-[76px] px-4 sm:px-6 lg:px-8 flex items-center">
        {/* ===== Left : desktop links ===== */}
        <div className="hidden lg:flex items-center gap-9">
          <Link
            to="/"
            onClick={() => handleLinkClick("Home")}
            className="nav-link flex items-center gap-1.5"
          >
            Home
          </Link>

          {/* Men dropdown */}
          <div
            className={`dropdown ${openDropdown === "men" ? "open" : ""}`}
            onMouseEnter={() => handleMouseEnter("men")}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              className="nav-link flex items-center gap-1.5"
              aria-haspopup="true"
              aria-expanded={openDropdown === "men"}
              onClick={() =>
                setOpenDropdown(openDropdown === "men" ? null : "men")
              }
            >
              Men
              <ChevronDown className="chev w-3.5 h-3.5" />
            </button>
            <div className="mega-panel absolute left-0 right-0 top-full px-6 lg:px-10">
              <div className="mx-auto max-w-[1440px] bg-white rounded-b-3xl shadow-mega border border-black/5 border-t-0 p-10 grid grid-cols-12 gap-10">
                {/* Categories */}
                <div className="col-span-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 mb-4">
                    Categories
                  </p>
                  {[
                    "Sneakers",
                    "Running",
                    "Basketball",
                    "Lifestyle",
                    "Skateboarding",
                  ].map((cat) => (
                    <a
                      key={cat}
                      onClick={() => handleLinkClick(`Men › ${cat}`)}
                      className="mega-link select-none"
                    >
                      {cat}
                      <ArrowRight className="mega-arrow w-3.5 h-3.5" />
                    </a>
                  ))}
                </div>
                {/* Collections */}
                <div className="col-span-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 mb-4">
                    Collections
                  </p>
                  {[
                    "New Arrivals",
                    "Best Sellers",
                    "Icons & Classics",
                  ].map((col) => (
                    <a
                      key={col}
                      onClick={() => handleLinkClick(`Men › ${col}`)}
                      className="mega-link select-none"
                    >
                      {col}
                      <ArrowRight className="mega-arrow w-3.5 h-3.5" />
                    </a>
                  ))}
                  <a
                    onClick={() =>
                      handleLinkClick("Men › Sale — up to 40%")
                    }
                    className="mega-link text-branddark font-semibold select-none"
                  >
                    Sale — up to 40%
                    <ArrowRight className="mega-arrow w-3.5 h-3.5" />
                  </a>
                </div>
                {/* Featured Card */}
                <a
                  onClick={() =>
                    handleLinkClick("Men › Featured Air Max Collection")
                  }
                  className="col-span-6 group relative rounded-2xl overflow-hidden block h-[220px] cursor-pointer"
                >
                  <img
                    src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80"
                    alt="Men featured"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>
                  <div className="absolute bottom-5 left-6 text-white">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
                      Featured
                    </p>
                    <p className="font-display text-xl mt-1">
                      Air Max Collection
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Women dropdown */}
          <div
            className={`dropdown ${openDropdown === "women" ? "open" : ""}`}
            onMouseEnter={() => handleMouseEnter("women")}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              className="nav-link flex items-center gap-1.5"
              aria-haspopup="true"
              aria-expanded={openDropdown === "women"}
              onClick={() =>
                setOpenDropdown(openDropdown === "women" ? null : "women")
              }
            >
              Women
              <ChevronDown className="chev w-3.5 h-3.5" />
            </button>
            <div className="mega-panel absolute left-0 right-0 top-full px-6 lg:px-10">
              <div className="mx-auto max-w-[1440px] bg-white rounded-b-3xl shadow-mega border border-black/5 border-t-0 p-10 grid grid-cols-12 gap-10">
                {/* Categories */}
                <div className="col-span-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 mb-4">
                    Categories
                  </p>
                  {[
                    "Sneakers",
                    "Running",
                    "Training & Gym",
                    "Lifestyle",
                    "Sandals & Slides",
                  ].map((cat) => (
                    <a
                      key={cat}
                      onClick={() => handleLinkClick(`Women › ${cat}`)}
                      className="mega-link select-none"
                    >
                      {cat}
                      <ArrowRight className="mega-arrow w-3.5 h-3.5" />
                    </a>
                  ))}
                </div>
                {/* Collections */}
                <div className="col-span-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 mb-4">
                    Collections
                  </p>
                  {[
                    "New Arrivals",
                    "Best Sellers",
                    "Street Icons",
                  ].map((col) => (
                    <a
                      key={col}
                      onClick={() => handleLinkClick(`Women › ${col}`)}
                      className="mega-link select-none"
                    >
                      {col}
                      <ArrowRight className="mega-arrow w-3.5 h-3.5" />
                    </a>
                  ))}
                  <a
                    onClick={() =>
                      handleLinkClick("Women › Sale — up to 40%")
                    }
                    className="mega-link text-branddark font-semibold select-none"
                  >
                    Sale — up to 40%
                    <ArrowRight className="mega-arrow w-3.5 h-3.5" />
                  </a>
                </div>
                {/* Featured Card */}
                <a
                  onClick={() =>
                    handleLinkClick("Women › Featured Retro Court Pack")
                  }
                  className="col-span-6 group relative rounded-2xl overflow-hidden block h-[220px] cursor-pointer"
                >
                  <img
                    src="https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=900&q=80"
                    alt="Women featured"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"></div>
                  <div className="absolute bottom-5 left-6 text-white">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
                      Featured
                    </p>
                    <p className="font-display text-xl mt-1">
                      Retro Court Pack
                    </p>
                  </div>
                </a>
              </div>
            </div>
          </div>

          <Link to="/products" className="nav-link">
            Products
          </Link>
        </div>

        {/* ===== Hamburger (mobile / tablet) ===== */}
        <button
          id="hamburger"
          type="button"
          aria-label="Open menu"
          onClick={onOpenMobile}
          className="icon-btn lg:hidden -ml-2"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* ===== Center logo ===== */}
        <a
          onClick={() => handleLinkClick("KICKS Home Logo")}
          className="absolute left-1/2 -translate-x-1/2 font-[900] text-[24px] md:text-[30px] tracking-tighter leading-none select-none hover:opacity-80 transition-opacity cursor-pointer text-[#141414]"
          style={{ fontFamily: "'Rubik', sans-serif" }}
        >
          KICKS
        </a>

        {/* ===== Right icons ===== */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto">
          <button
            id="search-btn"
            type="button"
            aria-label="Search"
            onClick={onOpenSearch}
            className="icon-btn"
          >
            <Search className="w-[22px] h-[22px]" />
          </button>

          {user ? (
            <div className="flex items-center gap-2 pl-1">
              <Link
                to="/orders"
                title="My Orders"
                className="flex items-center gap-1 text-xs font-bold text-gray-800 hover:text-black bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-full transition"
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Orders</span>
              </Link>

              <button
                onClick={handleLogout}
                title="Log Out"
                className="p-1.5 text-gray-500 hover:text-red-600 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              aria-label="Account"
              className="icon-btn flex"
            >
              <User className="w-[22px] h-[22px]" />
            </Link>
          )}

          <Link
            id="cart-btn"
            to="/cart"
            aria-label="Cart"
            className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FFA52F] hover:bg-[#f09a27] transition-colors active:scale-95 ml-1 sm:ml-2"
          >
            <span
              id="cart-count"
              key={cartCount}
              className="text-[11px] sm:text-[12px] font-bold text-black leading-none badge-pop"
            >
              {cartCount}
            </span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
