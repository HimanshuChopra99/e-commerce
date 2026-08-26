import { CheckCircle2, ShoppingBag, Heart } from 'lucide-react';
export const ToastNotification = ({
  show,
  message,
  type = 'cart',
  onViewCart,
}) => {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#232321] text-white p-4 rounded-2xl shadow-2xl border border-neutral-700 flex items-center gap-3 max-w-md animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-2 rounded-xl bg-white/10 text-emerald-400 shrink-0">
        {type === 'wishlist' ? (
          <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        )}
      </div>

      <div className="flex-1">
        <p className="text-xs font-bold text-white">{message}</p>
        <p className="text-[11px] text-neutral-400 mt-0.5">
          Item ready in your selection
        </p>
      </div>

      {type === 'cart' && onViewCart && (
        <button
          onClick={onViewCart}
          className="bg-[#4A69E2] hover:bg-blue-600 text-white text-xs font-extrabold uppercase px-3 py-2 rounded-xl transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>View Cart</span>
        </button>
      )}
    </div>
  );
};
