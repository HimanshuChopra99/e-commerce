'use client';

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, ChevronDown } from 'lucide-react';

export default function MobileDrawer({ isOpen, onClose, onSelectLink }) {
  const [openAcc, setOpenAcc] = useState(null);
  const navigate = useNavigate();

  const toggleAcc = (acc) => {
    setOpenAcc(openAcc === acc ? null : acc);
  };

  const handleSelect = (label) => {
    if (onSelectLink) onSelectLink(label);
    // Menu labels map to the same catalogue routes as desktop navigation.
    if (label === 'All Collections') navigate('/products');
    else if (label === 'About KICKS') navigate('/about');
    else if (label.includes(' › ')) {
      const [gender, category] = label.split(' › ');
      navigate(
        `/products?category=${encodeURIComponent(category.replace('Sale — up to 40%', 'sale').toLowerCase())}&gender=${gender.toLowerCase()}`
      );
    } else if (label === 'Sign In Button Clicked') navigate('/login');
    else if (label === 'Register Button Clicked') navigate('/signup');
    if (onClose) onClose();
  };

  return (
    <div
      id="mobile-drawer"
      className={`fixed inset-0 z-[80] lg:hidden ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <div
        id="mobile-backdrop"
        onClick={onClose}
        className={`drawer-backdrop absolute inset-0 bg-black/45 ${
          isOpen ? 'show' : ''
        }`}
      />
      <aside
        id="mobile-panel"
        className={`drawer-left absolute left-0 top-0 h-full w-[86%] max-w-[360px] bg-white flex flex-col shadow-mega pointer-events-auto ${
          isOpen ? 'show' : ''
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-black/5">
          <span className="font-display text-xl">KICKS</span>
          <button
            id="mobile-close"
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="icon-btn"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto hide-scroll px-5 py-4">
          <Link
            to="/"
            onClick={() => handleSelect('Home')}
            className="w-full flex items-center justify-between py-4 text-[17px] font-bold border-b border-black/5 text-left"
          >
            <span>Home</span>
          </Link>

          {/* Men Accordion */}
          <div
            className={`acc border-b border-black/5 ${
              openAcc === 'men' ? 'open' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => toggleAcc('men')}
              className="acc-head w-full flex items-center justify-between py-4 text-[17px] font-bold text-left"
            >
              Men
              <ChevronDown className="acc-chev w-4 h-4" />
            </button>
            <div className="acc-body">
              <div className="pb-4 pl-3 flex flex-col">
                {[
                  'Sneakers',
                  'Running',
                  'Basketball',
                  'Lifestyle',
                  'Skateboarding',
                ].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleSelect(`Men › ${cat}`)}
                    className="py-2.5 text-[15px] font-medium text-neutral-600 text-left hover:text-ink transition-colors"
                  >
                    {cat}
                  </button>
                ))}
                <button
                  onClick={() => handleSelect('Men › Sale — up to 40%')}
                  className="py-2.5 text-[15px] font-semibold text-branddark text-left"
                >
                  Sale — up to 40%
                </button>
              </div>
            </div>
          </div>

          {/* Women Accordion */}
          <div
            className={`acc border-b border-black/5 ${
              openAcc === 'women' ? 'open' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => toggleAcc('women')}
              className="acc-head w-full flex items-center justify-between py-4 text-[17px] font-bold text-left"
            >
              Women
              <ChevronDown className="acc-chev w-4 h-4" />
            </button>
            <div className="acc-body">
              <div className="pb-4 pl-3 flex flex-col">
                {[
                  'Sneakers',
                  'Running',
                  'Training & Gym',
                  'Lifestyle',
                  'Sandals & Slides',
                ].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleSelect(`Women › ${cat}`)}
                    className="py-2.5 text-[15px] font-medium text-neutral-600 text-left hover:text-ink transition-colors"
                  >
                    {cat}
                  </button>
                ))}
                <button
                  onClick={() => handleSelect('Women › Sale — up to 40%')}
                  className="py-2.5 text-[15px] font-semibold text-branddark text-left"
                >
                  Sale — up to 40%
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSelect('All Collections')}
            className="w-full block py-4 text-[17px] font-bold border-b border-black/5 text-left"
          >
            Collections
          </button>
          <button
            onClick={() => handleSelect('About KICKS')}
            className="w-full block py-4 text-[17px] font-bold border-b border-black/5 text-left"
          >
            About KICKS
          </button>
        </nav>

        <div className="px-5 py-5 border-t border-black/5 flex items-center gap-3">
          <button
            onClick={() => handleSelect('Sign In Button Clicked')}
            className="flex-1 h-12 rounded-full bg-ink text-white font-bold text-sm hover:bg-neutral-800 transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => handleSelect('Register Button Clicked')}
            className="flex-1 h-12 rounded-full border-2 border-ink font-bold text-sm hover:bg-ink hover:text-white transition-colors"
          >
            Register
          </button>
        </div>
      </aside>
    </div>
  );
}
