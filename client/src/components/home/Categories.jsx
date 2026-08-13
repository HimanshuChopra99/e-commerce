import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchCategories } from '../../store/categoriesSlice';

/* Arrow points EAST by default, rotates to NORTH-EAST on card hover */
const ArrowRight = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="transition-transform duration-500 ease-out group-hover:-rotate-45"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const GRADIENTS = [
  'linear-gradient(135deg, #e8e8e4 0%, #d8d8d4 100%)',
  'linear-gradient(135deg, #e4e8f0 0%, #d4dcea 100%)',
  'linear-gradient(135deg, #f0e8e4 0%, #ead4ce 100%)',
  'linear-gradient(135deg, #e4f0e8 0%, #ceead4 100%)',
];

const IMAGE_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : '';

function getImageSrc(img) {
  if (!img) return null;
  if (img.startsWith('http')) return img;
  return `${IMAGE_BASE}${img}`;
}

const CATEGORY_IMAGES = [
  'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=1200&auto=format&fit=crop',
];

function CategoryCard({ category, idx }) {
  const image = getImageSrc(category.image) || CATEGORY_IMAGES[idx % CATEGORY_IMAGES.length];
  const bg = GRADIENTS[idx % GRADIENTS.length];
  const displayName = (category.name || 'CATEGORY').toUpperCase();

  return (
    <Link
      to={`/products?category=${category.slug || category.id}`}
      className="group relative w-full h-[380px] sm:h-[420px] rounded-2xl overflow-hidden block border-0 outline-none shadow-sm hover:shadow-2xl transition-all duration-500 isolate [transform:translateZ(0)]"
      style={{ background: bg }}
    >
      {/* 100% Full-bleed Image Container */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <img
          src={image}
          alt={displayName}
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-110"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80';
          }}
          loading="lazy"
          decoding="async"
        />
        {/* Subtle Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-500 group-hover:from-black/85" />
      </div>

      {/* Top Glassmorphic Badge */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
        <span className="text-[10px] font-bold tracking-widest text-white/90 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border-0 uppercase">
          0{idx + 1}
        </span>
        <span className="text-[9px] font-semibold tracking-widest text-white/90 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full border-0 uppercase">
          {category.productCount ? `${category.productCount}+ STYLES` : 'AVAILABLE NOW'}
        </span>
      </div>

      {/* Default Title on Image (fades out when white panel slides up) */}
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 z-10 transition-all duration-500 ease-out group-hover:opacity-0 group-hover:-translate-y-2">
        <span className="text-[9px] text-white/70 font-semibold uppercase tracking-widest block mb-0.5">
          {category.description ? category.description.slice(0, 20) : 'FEATURED'}
        </span>
        <h3
          className="font-black text-white uppercase leading-tight"
          style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)' }}
        >
          {displayName}
        </h3>
      </div>

      {/* White Footer Panel — slides UP from bottom on hover */}
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 z-20 flex items-end justify-between bg-white/95 backdrop-blur-md border-0 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]">
        <div>
          <span className="text-[9px] text-gray-600 font-semibold uppercase tracking-widest block mb-0.5">
            {category.description ? category.description.slice(0, 20) : 'FEATURED'}
          </span>
          <h3
            className="font-black text-[#111111] uppercase leading-tight"
            style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)' }}
          >
            {displayName}
          </h3>
          <span className="text-[9px] text-gray-500 font-medium mt-1 block">
            {category.productCount ? `${category.productCount}+ styles` : 'Available now'}
          </span>
        </div>

        {/* Action Button with rotating arrow */}
        <button className="w-9 h-9 rounded-full bg-[#111111] text-white border-0 outline-none flex items-center justify-center group-hover:bg-[#4C64F4] transition-all duration-300 group-hover:scale-110 shadow-md shrink-0">
          <ArrowRight />
        </button>
      </div>
    </Link>
  );
}

function CategorySkeleton() {
  return (
    <div className="w-full h-[380px] sm:h-[420px] rounded-2xl overflow-hidden shadow-sm animate-pulse bg-gray-200 relative p-5 flex flex-col justify-between border-0">
      <div className="flex justify-between items-center">
        <div className="h-5 w-8 bg-gray-300 rounded-full" />
        <div className="h-5 w-20 bg-gray-300 rounded-full" />
      </div>
      <div className="h-20 bg-white/70 rounded-xl p-4 flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-3 w-16 bg-gray-300 rounded" />
          <div className="h-6 w-28 bg-gray-300 rounded" />
        </div>
        <div className="w-9 h-9 rounded-full bg-gray-300" />
      </div>
    </div>
  );
}

const Categories = () => {
  const dispatch = useDispatch();
  const { items: categories, loading } = useSelector((state) => state.categories);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const displayCategories = categories.slice(0, 4);

  return (
    <section className="py-14 px-4 sm:px-6 lg:px-8 bg-white" id="categories">
      <div className="max-w-[1280px] mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h2
            className="font-black text-[#111111] uppercase leading-none"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            CATEGORIES
          </h2>
            <Link
              to="/products"
              className="bg-[#4C64F4] hover:bg-[#3B53E3] text-white text-[13px] font-medium sm:font-[700] tracking-wider uppercase px-6 py-4 rounded-[12px] shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              Shop New Drops
            </Link>
        </div>

        {/* 4 Side-by-Side Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <CategorySkeleton key={i} />)
            : displayCategories.length > 0
            ? displayCategories.map((cat, idx) => (
                <CategoryCard key={cat.id || cat.publicId || idx} category={cat} idx={idx} />
              ))
            : /* Fallback placeholders when database is empty */
              ['RUNNING', 'LIFESTYLE', 'FORMAL', 'SPORTS'].map((name, idx) => (
                <CategoryCard
                  key={name}
                  category={{ name, description: 'FEATURED', productCount: 12 }}
                  idx={idx}
                />
              ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;