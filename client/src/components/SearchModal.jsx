import { useState } from "react";
import { Search, X, TrendingUp, ArrowRight } from "lucide-react";
import { RELATED_PRODUCTS } from "../data/productData";
export const SearchModal = ({ isOpen, onClose, onSelectProduct }) => {
  const [query, setQuery] = useState("");
  if (!isOpen) return null;
  const popularTags = ["4DFWD", "Ultraboost", "Parley", "Running", "Navy", "Marathon"];
  const filtered = RELATED_PRODUCTS.filter(
    (item) => item.name.toLowerCase().includes(query.toLowerCase()) || item.category.toLowerCase().includes(query.toLowerCase())
  );
  return <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-neutral-200 overflow-hidden relative">
        
        {
    /* Input Header */
  }
        <div className="p-4 sm:p-5 border-b border-neutral-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-neutral-400 shrink-0" />
          <input
    type="text"
    autoFocus
    placeholder="Search KICKS for 4DFWD, Ultraboost, Parley..."
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    className="flex-1 text-sm sm:text-base font-semibold text-neutral-900 focus:outline-none placeholder:text-neutral-400 placeholder:font-normal"
  />
          {query && <button
    onClick={() => setQuery("")}
    className="text-xs text-neutral-400 hover:text-neutral-700 font-bold underline mr-2"
  >
              Clear
            </button>}
          <button
    onClick={onClose}
    className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 transition-colors cursor-pointer"
  >
            <X className="w-5 h-5" />
          </button>
        </div>

        {
    /* Body Content */
  }
        <div className="p-5 max-h-[65vh] overflow-y-auto space-y-6">
          {
    /* Quick Tags */
  }
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Trending Searches</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((tag) => <button
    key={tag}
    onClick={() => setQuery(tag)}
    className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
  >
                  {tag}
                </button>)}
            </div>
          </div>

          {
    /* Results List */
  }
          <div>
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
              {query ? `Results for "${query}"` : "Recommended Shoes"}
            </div>

            <div className="space-y-2">
              {filtered.map((product) => <div
    key={product.id}
    onClick={() => {
      onSelectProduct(product.id);
      onClose();
    }}
    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-neutral-50 transition-colors cursor-pointer group border border-transparent hover:border-neutral-200"
  >
                  <div className="flex items-center gap-3">
                    <img
    src={product.image}
    alt={product.name}
    className="w-12 h-12 object-cover rounded-xl bg-neutral-100 shrink-0"
   loading="lazy" decoding="async"/>
                    <div>
                      <h4 className="font-extrabold text-xs text-neutral-900 uppercase group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h4>
                      <p className="text-[11px] text-neutral-500">{product.category}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-xs text-[#4A69E2]">${product.price.toFixed(2)}</span>
                    <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>)}
            </div>
          </div>
        </div>

      </div>
    </div>;
};
