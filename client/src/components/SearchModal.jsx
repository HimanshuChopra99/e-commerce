import { useState, useEffect, useRef } from 'react';
import { Search, X, TrendingUp, ArrowRight } from 'lucide-react';

const IMAGE_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : '';

function getImageSrc(img) {
  if (!img)
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80';
  if (img.startsWith('http')) return img;
  return `${IMAGE_BASE}${img}`;
}

export const SearchModal = ({ isOpen, onClose, onSelectProduct }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const popularTags = [
    'Running',
    'Sneakers',
    'Men',
    'Women',
    'Leather',
    'Boots',
    'Basketball',
    'Under $100',
  ];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setLoading(true);
      const cleanQ = query.trim();
      const url = `${import.meta.env.VITE_API_URL || '/api'}/products?${cleanQ ? `q=${encodeURIComponent(cleanQ)}&` : ''}limit=10&sort=popular`;

      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.data)) {
            setResults(data.data);
          } else {
            setResults([]);
          }
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-neutral-200 overflow-hidden relative">
        {/* Input Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search kicks by brand, style, material, category…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm sm:text-base font-semibold text-neutral-900 focus:outline-none placeholder:text-neutral-400 placeholder:font-normal"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-neutral-400 hover:text-neutral-700 font-bold underline mr-2"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 max-h-[65vh] overflow-y-auto space-y-6">
          {/* Quick Tags */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Trending Searches</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setQuery(tag)}
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Results List */}
          <div>
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
              {query ? `Results for "${query}"` : 'Recommended Shoes'}
            </div>

            <div className="space-y-2">
              {loading ? (
                <p className="text-center text-xs text-neutral-400 py-6">
                  Searching live catalogue...
                </p>
              ) : results.length === 0 ? (
                <p className="text-center text-xs text-neutral-400 py-6">
                  No matching shoes found for "{query}".
                </p>
              ) : (
                results.map((product) => {
                  const imgSrc = getImageSrc(
                    product.image || (product.images && product.images[0])
                  );
                  return (
                    <div
                      key={product.id || product.slug}
                      onClick={() => {
                        onSelectProduct(product.slug || product.id);
                        onClose();
                      }}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-neutral-50 transition-colors cursor-pointer group border border-transparent hover:border-neutral-200"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={imgSrc}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded-xl bg-neutral-100 shrink-0"
                          loading="lazy"
                          decoding="async"
                        />
                        <div>
                          <h4 className="font-extrabold text-xs text-neutral-900 uppercase group-hover:text-blue-600 transition-colors">
                            {product.name}
                          </h4>
                          <p className="text-[11px] text-neutral-500">
                            {product.brand} •{' '}
                            {product.category?.name ||
                              product.category ||
                              'Footwear'}{' '}
                            {product.gender ? `• ${product.gender}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xs text-[#4A69E2]">
                          ${Number(product.price).toFixed(2)}
                        </span>
                        <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
