import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchCategories } from '../../store/categoriesSlice';

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
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
  'https://images.pexels.com/photos/1456733/pexels-photo-1456733.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
  'https://images.pexels.com/photos/12969390/pexels-photo-12969390.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
  'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
  'https://images.pexels.com/photos/3261069/pexels-photo-3261069.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200',
];

function CategoryCard({ category, idx }) {
  const [hovered, setHovered] = React.useState(false);
  const image = getImageSrc(category.image) || CATEGORY_IMAGES[idx % CATEGORY_IMAGES.length];
  const bg = GRADIENTS[idx % GRADIENTS.length];
  const displayName = (category.name || 'CATEGORY').toUpperCase();

  return (
    <Link
      to={`/products?category=${category.slug || category.id}`}
      className="category-card flex-1 min-h-[320px] group rounded-2xl overflow-hidden shadow-sm block"
      style={{ background: bg }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="relative h-[260px] flex items-center justify-center overflow-hidden p-4">
        <img
          src={image}
          alt={displayName}
          className={`h-full w-auto object-contain transition-all duration-500 ${
            hovered ? 'scale-110 -translate-y-2' : 'scale-100'
          }`}
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80';
          }}
          loading="lazy"
          decoding="async"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-5 bg-white/70 backdrop-blur-md">
        <div>
          <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-widest block mb-0.5">
            {category.description ? category.description.slice(0, 20) : 'Featured'}
          </span>
          <h3
            className="font-black text-[#111111] uppercase leading-tight"
            style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)' }}
          >
            {displayName}
          </h3>
          <span className="text-[9px] text-gray-400 font-medium mt-1 block">
            {category.productCount ? `${category.productCount}+ styles` : 'Available now'}
          </span>
        </div>
        <button className="w-9 h-9 rounded-full bg-[#111111] text-white flex items-center justify-center hover:bg-[#4C64F4] transition-all duration-300 hover:scale-110 shadow-md">
          <ArrowRight />
        </button>
      </div>
    </Link>
  );
}

function CategorySkeleton() {
  return (
    <div className="flex-1 min-h-[320px] rounded-2xl overflow-hidden shadow-sm animate-pulse bg-gray-200">
      <div className="h-[260px] bg-gray-300" />
      <div className="px-6 py-5 bg-white/70">
        <div className="h-3 w-20 bg-gray-300 rounded mb-2" />
        <div className="h-6 w-32 bg-gray-300 rounded" />
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
            className="text-sm font-bold text-[#111111] hover:text-[#4C64F4] transition-colors underline"
          >
            View All →
          </Link>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <CategorySkeleton key={i} />)
            : displayCategories.length > 0
            ? displayCategories.map((cat, idx) => (
                <CategoryCard key={cat.id || cat.publicId} category={cat} idx={idx} />
              ))
            : /* No categories yet — show placeholders */
              ['Running', 'Lifestyle', 'Formal', 'Sports'].map((name, idx) => (
                <Link
                  key={name}
                  to="/products"
                  className="flex-1 min-h-[320px] rounded-2xl overflow-hidden shadow-sm block"
                  style={{ background: GRADIENTS[idx] }}
                >
                  <div className="h-[260px] flex items-center justify-center">
                    <span className="text-6xl">👟</span>
                  </div>
                  <div className="flex items-center justify-between px-6 py-5 bg-white/70 backdrop-blur-md">
                    <h3 className="font-black text-[#111111] uppercase text-xl">{name}</h3>
                    <div className="w-9 h-9 rounded-full bg-[#111111] text-white flex items-center justify-center">
                      <ArrowRight />
                    </div>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
