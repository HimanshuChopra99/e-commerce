import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { fetchProducts, fetchFilters } from '../store/productsSlice';
import { fetchCategories } from '../store/categoriesSlice';
import ProductCard from '../components/common/ProductCard';
import FilterSidebar from '../components/common/FilterSidebar';

const SORT_OPTIONS = [
  { label: 'Trending', value: 'trending' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Newest', value: 'newest' },
];

const IMAGE_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : '';

function getImageSrc(img) {
  if (!img) return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80';
  if (img.startsWith('http')) return img;
  return `${IMAGE_BASE}${img}`;
}

function ProductSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-2xl p-4">
      <div className="bg-gray-200 aspect-square rounded-xl mb-4" />
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  );
}

export default function ProductListPage() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { items, meta, loading, filters: serverFilters } = useSelector((s) => s.products);
  const { items: categories } = useSelector((s) => s.categories);

  const [sortOpen, setSortOpen] = useState(false);

  // Size and colour are intentionally single-select. If an old shared URL has
  // comma-separated values, use only the first valid choice and normalize it.
  const categoryParam  = searchParams.get('category')  || '';
  const genderParam    = searchParams.get('gender')    || '';
  const rawSizeParam   = searchParams.get('size')      || '';
  const rawColorParam  = searchParams.get('color')     || '';
  const sizeParam      = rawSizeParam.split(',').find(Boolean) || '';
  const colorParam     = rawColorParam.split(',').find(Boolean) || '';
  const currentSort    = searchParams.get('sort')      || 'trending';
  const currentPage    = parseInt(searchParams.get('page')     || '1',    10);
  const currentSearch  = searchParams.get('q')         || '';
  const rawPriceMin    = searchParams.get('priceMin')  || searchParams.get('minPrice') || '';
  const rawPriceMax    = searchParams.get('priceMax')  || searchParams.get('maxPrice') || '';
  const currentPriceMin = rawPriceMin ? parseInt(rawPriceMin, 10) : undefined;
  const currentPriceMax = rawPriceMax ? parseInt(rawPriceMax, 10) : 1000;

  // Derived arrays — only used for rendering / passing to sidebar, NOT in deps.
  const currentCategories = categoryParam.split(',').filter(Boolean);
  const currentGenders    = genderParam.split(',').filter(Boolean);
  const currentSizes      = sizeParam ? [sizeParam] : [];
  const currentColors     = colorParam ? [colorParam] : [];

  const sidebarFilters = useMemo(() => ({
    refineBy: currentSearch ? [currentSearch] : [],
    sizes: currentSizes,
    colors: currentColors,
    categories: currentCategories,
    gender: currentGenders,
    priceRange: currentPriceMax,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [categoryParam, genderParam, sizeParam, colorParam, currentSearch, currentPriceMax]);

  useEffect(() => {
    if (rawSizeParam === sizeParam && rawColorParam === colorParam) return;
    const next = new URLSearchParams(searchParams);
    if (sizeParam) next.set('size', sizeParam); else next.delete('size');
    if (colorParam) next.set('color', colorParam); else next.delete('color');
    setSearchParams(next, { replace: true });
  }, [rawSizeParam, rawColorParam, sizeParam, colorParam, searchParams, setSearchParams]);

  const handleFilterChange = (newFilters) => {
    const next = new URLSearchParams(searchParams);

    if (newFilters.categories?.length > 0) {
      next.set('category', newFilters.categories.join(','));
    } else {
      next.delete('category');
    }

    if (newFilters.gender?.length > 0) {
      next.set('gender', newFilters.gender.join(','));
    } else {
      next.delete('gender');
    }

    if (newFilters.sizes?.length > 0) {
      next.set('size', String(newFilters.sizes[0]));
    } else {
      next.delete('size');
    }

    if (newFilters.colors?.length > 0) {
      next.set('color', newFilters.colors[0]);
    } else {
      next.delete('color');
    }

    if (newFilters.priceRange && newFilters.priceRange < 1000) {
      next.set('priceMax', String(newFilters.priceRange));
    } else {
      next.delete('priceMax');
    }

    next.delete('page');
    setSearchParams(next);
  };

  // Used for filter/sort changes — always resets to page 1.
  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete('page'); // reset pagination whenever a filter/sort changes
    setSearchParams(next);
  };

  // Used ONLY for pagination clicks — keeps all current filters intact.
  const goToPage = (pg) => {
    const next = new URLSearchParams(searchParams);
    if (pg <= 1) {
      next.delete('page');
    } else {
      next.set('page', String(pg));
    }
    setSearchParams(next);
    // Scroll to top of the product grid smoothly.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchData = useCallback(() => {
    dispatch(fetchProducts({
      category: categoryParam  || undefined,
      gender:   genderParam    || undefined,
      size:     sizeParam      || undefined,
      color:    colorParam     || undefined,
      sort:     currentSort !== 'trending' ? currentSort : undefined,
      page:     currentPage,
      limit:    12,
      minPrice: currentPriceMin,
      maxPrice: currentPriceMax < 1000 ? currentPriceMax : undefined,
      q:        currentSearch  || undefined,
    }));
  // Stable primitive deps — no new array references every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, categoryParam, genderParam, sizeParam, colorParam, currentSort, currentPage, currentPriceMin, currentPriceMax, currentSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    dispatch(fetchFilters());
    dispatch(fetchCategories());
  }, [dispatch]);

  const normalizedProducts = items.map((p) => ({
    id: p.id || p.publicId,
    slug: p.slug,
    name: p.name,
    price: Number(p.price),
    image: getImageSrc(p.image || (p.images && p.images[0])),
    category: p.category?.name || p.category || '',
    gender: p.gender || 'Unisex',
    badge: p.featured ? 'New' : '',
    badgeBg: 'bg-[#4C64F4]',
  }));

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === currentSort)?.label || 'Trending';

  return (
    <div className="min-h-screen bg-[#EAE9E5]" style={{ fontFamily: "'Rubik', sans-serif" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-8">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-[22px] sm:text-[26px] font-black text-[#1E1E1E] uppercase tracking-wide">
              {currentCategories.length > 0
                ? categories.find((c) => c.slug === currentCategories[0] || c.name === currentCategories[0])?.name || currentCategories.join(', ')
                : 'Life Style Shoes'}
            </h1>
            <p className="text-[13px] text-[#888] mt-0.5">
              {loading ? 'Loading...' : `${meta.total} items`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-[10px] px-4 py-2.5 text-[13px] font-semibold text-[#1E1E1E] shadow-sm hover:shadow-md transition-all uppercase tracking-widest"
              >
                {currentSortLabel}
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-[12px] shadow-xl z-20 min-w-[200px] overflow-hidden">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        updateParam('sort', opt.value);
                        setSortOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-[13px] font-semibold hover:bg-[#F5F5F3] transition-colors ${
                        currentSort === opt.value ? 'text-[#4C64F4]' : 'text-[#1E1E1E]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Layout: Sidebar + Grid */}
        <div className="flex gap-8 items-start">
          {/* Filter Sidebar */}
          <FilterSidebar
            filters={sidebarFilters}
            onChange={handleFilterChange}
            availableFilters={serverFilters}
            categories={categories}
          />

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array.from({ length: 9 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : normalizedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <span className="text-5xl mb-4">👟</span>
                <h3 className="text-[18px] font-bold text-[#1E1E1E] mb-2">No products found</h3>
                <p className="text-[#888] text-[14px]">Try adjusting your filters.</p>
                <button
                  onClick={() => setSearchParams({})}
                  className="mt-5 bg-[#4C64F4] text-white px-6 py-2.5 rounded-[10px] text-[13px] font-bold uppercase tracking-wider hover:bg-[#3a52e0] transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {normalizedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {meta.totalPages > 1 && (() => {
                  const WINDOW = 2;
                  const start = Math.max(1, currentPage - WINDOW);

                  const adjustedStart = Math.max(1, Math.min(start, meta.totalPages - 4));
                  const adjustedEnd = Math.min(meta.totalPages, adjustedStart + 4);
                  const pages = Array.from({ length: adjustedEnd - adjustedStart + 1 }, (_, i) => adjustedStart + i);

                  return (
                    <div className="flex justify-center items-center gap-2 mt-10">
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-[10px] text-[13px] font-bold border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        ← Prev
                      </button>

                      {adjustedStart > 1 && <span className="text-gray-400 text-sm">…</span>}

                      {pages.map((pg) => (
                        <button
                          key={pg}
                          onClick={() => goToPage(pg)}
                          className={`w-9 h-9 rounded-[10px] text-[13px] font-bold transition-colors ${
                            currentPage === pg
                              ? 'bg-[#1E1E1E] text-white'
                              : 'border border-gray-200 hover:bg-gray-100 text-[#1E1E1E]'
                          }`}
                        >
                          {pg}
                        </button>
                      ))}

                      {adjustedEnd < meta.totalPages && <span className="text-gray-400 text-sm">…</span>}

                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === meta.totalPages}
                        className="px-4 py-2 rounded-[10px] text-[13px] font-bold border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
