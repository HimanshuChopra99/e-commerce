import { useState } from "react";
import { Search, User, Menu, X, ChevronDown, Heart } from "lucide-react";
export const Header = ({
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenWishlist,
  onSearchClick
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  return <header className="sticky top-0 z-40 w-full pt-3 pb-2 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
    {
      /* Container matching original pill header style */
    }
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-neutral-200/80 px-4 sm:px-6 py-3 flex items-center justify-between transition-all duration-200">

      {
        /* Left Navigation */
      }
      <nav className="hidden md:flex items-center space-x-6 text-sm font-semibold text-neutral-900">
        <a
          href="#new-drops"
          className="flex items-center gap-1.5 hover:text-blue-600 transition-colors group"
        >
          <span>Home</span>
          <span className="text-base group-hover:scale-125 transition-transform">🔥</span>
        </a>

        <div
          className="relative"
          onMouseEnter={() => setActiveDropdown("men")}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <button className="flex items-center gap-1 hover:text-blue-600 transition-colors py-1 cursor-pointer">
            <span>Men</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
          </button>
          {activeDropdown === "men" && <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-neutral-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <a href="#running" className="block px-4 py-2 text-xs hover:bg-neutral-50 text-neutral-700 hover:text-blue-600 font-medium">Running Shoes</a>
            <a href="#lifestyle" className="block px-4 py-2 text-xs hover:bg-neutral-50 text-neutral-700 hover:text-blue-600 font-medium">Lifestyle & Basketball</a>
            <a href="#apparel" className="block px-4 py-2 text-xs hover:bg-neutral-50 text-neutral-700 hover:text-blue-600 font-medium">Apparel & Jackets</a>
            <a href="#accessories" className="block px-4 py-2 text-xs hover:bg-neutral-50 text-neutral-700 hover:text-blue-600 font-medium">Accessories & Socks</a>
          </div>}
        </div>

        <div
          className="relative"
          onMouseEnter={() => setActiveDropdown("women")}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <button className="flex items-center gap-1 hover:text-blue-600 transition-colors py-1 cursor-pointer">
            <span>Women</span>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
          </button>
          {activeDropdown === "women" && <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-neutral-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <a href="#women-running" className="block px-4 py-2 text-xs hover:bg-neutral-50 text-neutral-700 hover:text-blue-600 font-medium">Running Shoes</a>
            <a href="#women-training" className="block px-4 py-2 text-xs hover:bg-neutral-50 text-neutral-700 hover:text-blue-600 font-medium">Gym & Training</a>
            <a href="#women-slides" className="block px-4 py-2 text-xs hover:bg-neutral-50 text-neutral-700 hover:text-blue-600 font-medium">Slides & Sandals</a>
          </div>}
        </div>
      </nav>

      {
        /* Mobile Hamburger */
      }
      <button
        className="md:hidden p-1.5 rounded-lg text-neutral-800 hover:bg-neutral-100 transition-colors"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle Menu"
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {
        /* Center Logo - KICKS */
      }
      <div className="flex-1 text-center md:flex-initial">
        <a href="#" className="inline-block group">
          <span className="font-brand font-black text-2xl sm:text-3xl tracking-tighter text-neutral-900 group-hover:text-blue-600 transition-colors">
            KICKS
          </span>
        </a>
      </div>

      {
        /* Right Action Icons */
      }
      <div className="flex items-center space-x-2 sm:space-x-4">
        <button
          onClick={onSearchClick}
          className="p-2 rounded-full hover:bg-neutral-100 text-neutral-800 transition-colors cursor-pointer"
          title="Search"
        >
          <Search className="w-5 h-5 sm:w-5 sm:h-5" />
        </button>

        <button
          onClick={onOpenWishlist}
          className="p-2 rounded-full hover:bg-neutral-100 text-neutral-800 transition-colors relative cursor-pointer"
          title="Wishlist"
        >
          <Heart className="w-5 h-5 sm:w-5 sm:h-5" />
          {wishlistCount > 0 && <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {wishlistCount}
          </span>}
        </button>

        <button
          className="hidden sm:block p-2 rounded-full hover:bg-neutral-100 text-neutral-800 transition-colors cursor-pointer"
          title="Account"
        >
          <User className="w-5 h-5" />
        </button>

        {
          /* Cart Icon with exact yellow/orange round badge from design */
        }
        <button
          onClick={onOpenCart}
          className="p-2 rounded-full hover:bg-neutral-100 transition-colors relative cursor-pointer flex items-center justify-center"
          title="Cart"
        >
          <span className="bg-[#FFA500] text-black text-xs font-bold w-6 h-6 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-sm hover:scale-105 transition-transform">
            {cartCount}
          </span>
        </button>
      </div>
    </div>

    {
      /* Mobile Drawer Menu */
    }
    {mobileMenuOpen && <div className="md:hidden mt-2 bg-white rounded-2xl p-4 shadow-xl border border-neutral-200 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="space-y-3 font-semibold text-neutral-800">
        <a href="#new-drops" className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50">
          <span>Home</span>
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Hot</span>
        </a>
        <a href="#men" className="block p-2 rounded-lg hover:bg-neutral-50">Men's Collection</a>
        <a href="#women" className="block p-2 rounded-lg hover:bg-neutral-50">Women's Collection</a>
        <a href="#sustainability" className="block p-2 rounded-lg hover:bg-neutral-50">Parley Ocean Plastic</a>
        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
          <span>Country / Currency</span>
          <span className="font-bold text-neutral-900">US / USD ($)</span>
        </div>
      </div>
    </div>}
  </header>;
};
