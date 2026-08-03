import { Heart, Check, CreditCard, ShieldCheck } from "lucide-react";
export const ProductDetails = ({
  product,
  selectedColor,
  selectedSize,
  isWishlisted,
  onSelectColor,
  onSelectSize,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  onOpenSizeChart,
  isSizeAvailable = (size) => size.available
}) => {
  return <div className="w-full flex flex-col space-y-6">

    {
      /* Category / Badge */
    }
    <div>
      <span className="inline-block bg-[#4A69E2] text-white text-xs font-semibold px-3 py-1.5 rounded-lg tracking-wide shadow-2xs">
        {product.tag}
      </span>
    </div>

    {
      /* Product Title */
    }
    <div>
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-neutral-900 tracking-tight leading-tight">
        {product.name}
      </h1>
      <div className="mt-2 text-2xl font-bold text-[#4A69E2]">
        ${product.price.toFixed(2)}
      </div>
    </div>

    {
      /* COLOR Selector */
    }
    <div className="space-y-3">
      <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-900">
        COLOR
      </label>
      <div className="flex items-center space-x-3">
        {product.colors.map((color) => {
          const isSelected = selectedColor.id === color.id;
          return <button
            key={color.id}
            onClick={() => onSelectColor(color)}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer ${isSelected ? "ring-2 ring-neutral-900 ring-offset-2 scale-105" : "hover:scale-105 border border-neutral-300"}`}
            style={{ backgroundColor: color.hex }}
            title={color.name}
            aria-label={`Select color ${color.name}`}
          >
            {isSelected && <Check className={`w-4 h-4 ${color.id === "shadow-navy" ? "text-white" : "text-neutral-900"}`} />}
          </button>;
        })}
      </div>
    </div>

    {
      /* SIZE Selector */
    }
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-900">
          SIZE
        </label>
        <button
          onClick={onOpenSizeChart}
          className="text-xs font-bold uppercase underline tracking-wider text-neutral-900 hover:text-[#4A69E2] transition-colors cursor-pointer"
        >
          SIZE CHART
        </button>
      </div>

      {
        /* Size Grid */
      }
      <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
        {product.sizes.map((size) => {
          const available = isSizeAvailable(size);
          const isSelected = selectedSize?.value === size.value;
          return <button
            key={size.value}
            disabled={!available}
            onClick={() => available && onSelectSize(size)}
            className={`h-11 sm:h-12 rounded-lg font-bold text-sm transition-all duration-150 flex items-center justify-center ${!available ? "bg-neutral-100 text-neutral-400 border border-neutral-200 opacity-50 cursor-not-allowed line-through" : isSelected ? "bg-[#232321] text-white shadow-sm ring-1 ring-[#232321] cursor-pointer" : "bg-white text-neutral-900 border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 cursor-pointer"}`}
            aria-disabled={!available}
          >
            {size.value}
          </button>;
        })}
      </div>
    </div>

    {
      /* ACTION BUTTONS */
    }
    <div className="space-y-3 pt-2">
      {
        /* ADD TO CART & WISHLIST ROW */
      }
      <div className="flex items-center space-x-2">
        <button
          onClick={onAddToCart}
          className="flex-1 bg-[#232321] hover:bg-black text-white font-extrabold text-xs sm:text-sm tracking-wider uppercase py-4 rounded-xl transition-all duration-200 shadow-md active:scale-[0.99] flex items-center justify-center cursor-pointer"
        >
          ADD TO CART
        </button>

        <button
          onClick={onToggleWishlist}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center ${isWishlisted ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-white border-neutral-300 text-neutral-900 hover:bg-neutral-50"}`}
          title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-label="Wishlist"
        >
          <Heart className={`w-5 h-5 ${isWishlisted ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>
      </div>

      {
        /* BUY IT NOW BUTTON */
      }
      <button
        onClick={onBuyNow}
        className="w-full bg-[#4A69E2] hover:bg-[#3b58c8] text-white font-extrabold text-xs sm:text-sm tracking-wider uppercase py-4 rounded-xl transition-all duration-200 shadow-md active:scale-[0.99] cursor-pointer"
      >
        BUY IT NOW
      </button>
    </div>

    {
      /* ABOUT THE PRODUCT SECTION */
    }
    <div className="pt-4 border-t border-neutral-200/80 space-y-3 text-neutral-800">
      <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900">
        ABOUT THE PRODUCT
      </h3>

      <div className="text-xs text-neutral-600 font-medium">
        {selectedColor.name}
      </div>

      <p className="text-xs text-neutral-600 leading-relaxed font-normal">
        This product is excluded from all promotional discounts and offers.
      </p>

      {
        /* Bullet points with bullet dots */
      }
      <ul className="space-y-2 text-xs text-neutral-700 font-medium">
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 mt-1.5 shrink-0" />
          <span>Pay over time in interest-free installments with Affirm, Klarna or Afterpay.</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 mt-1.5 shrink-0" />
          <span>Join adiClub to get unlimited free standard shipping, returns, & exchanges.</span>
        </li>
      </ul>

      {
        /* Value Badges */
      }
      <div className="grid grid-cols-2 gap-3 pt-3">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/60 border border-neutral-200 text-xs">
          <CreditCard className="w-4 h-4 text-[#4A69E2] shrink-0" />
          <span className="font-semibold text-neutral-800">Secure Checkout</span>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/60 border border-neutral-200 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold text-neutral-800">100% Authentic</span>
        </div>
      </div>
    </div>
  </div>;
};
