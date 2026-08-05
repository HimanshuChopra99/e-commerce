import { Star, ArrowRight, ShoppingBag } from "lucide-react";
export const RelatedProducts = ({
  products,
  onSelectProduct,
  onQuickAdd,
  onViewAll
}) => {
  return <section className="my-12 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase text-neutral-900 tracking-tight">
            You May Also Like
          </h2>
          <p className="text-xs text-neutral-500 font-medium">Recommended performance running & street footwear</p>
        </div>

        <button type="button" onClick={onViewAll} className="text-xs font-extrabold uppercase tracking-wider text-[#4A69E2] hover:underline flex items-center gap-1 cursor-pointer">
          <span>View All Drops</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {products.map((item) => <div
    key={item.id}
    className="group bg-white rounded-3xl p-4 border border-neutral-200/80 shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
  >
            <div>
              {
    /* Image Container */
  }
              <div
    onClick={() => onSelectProduct(item)}
    className="relative bg-[#EAEAE8] rounded-2xl overflow-hidden aspect-square cursor-pointer mb-3"
  >
                <img
    src={item.image}
    alt={item.name}
    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
   loading="lazy" decoding="async"/>

                {item.tag && <span className="absolute top-2.5 left-2.5 bg-[#4A69E2] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg">
                    {item.tag}
                  </span>}

                <button
    onClick={(e) => {
      e.stopPropagation();
      onQuickAdd(item);
    }}
    className="absolute bottom-2.5 right-2.5 bg-[#232321] hover:bg-black text-white p-2.5 rounded-xl shadow-md transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
    title="Quick Add"
  >
                  <ShoppingBag className="w-4 h-4" />
                </button>
              </div>

              {
    /* Text Info */
  }
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{item.rating}</span>
                  <span className="text-neutral-400 font-normal">({item.category})</span>
                </div>

                <h3
    onClick={() => onSelectProduct(item)}
    className="font-extrabold text-xs uppercase text-neutral-900 line-clamp-1 hover:text-[#4A69E2] transition-colors cursor-pointer"
  >
                  {item.name}
                </h3>
              </div>
            </div>

            <div className="pt-3 mt-2 border-t border-neutral-100 flex items-center justify-between">
              <span className="font-extrabold text-sm text-[#4A69E2]">
                ${item.price.toFixed(2)}
              </span>
              <span className="text-[10px] font-semibold text-neutral-400">
                {item.colorCount} Colors
              </span>
            </div>
          </div>)}
      </div>
    </section>;
};
