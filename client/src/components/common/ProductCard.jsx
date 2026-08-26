import { useNavigate } from 'react-router-dom';

const badgeColors = {
  New: 'bg-[#4C64F4]',
  '20% off': 'bg-[#E9AD43]',
  Sale: 'bg-red-500',
  Hot: 'bg-orange-500',
};

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  const handleNavigate = () => {
    const identifier = product.slug || product.id;
    navigate(`/product/${identifier}`);
  };

  return (
    <div
      className="flex flex-col group cursor-pointer"
      onClick={handleNavigate}
    >
      {/* Outer Card with White Frame */}
      <div className="bg-white p-1.5 rounded-[16px] sm:rounded-[32px] shadow-sm transition-all duration-300 group-hover:shadow-md relative overflow-hidden">
        {/* Inner Container */}
        <div className="bg-[#EDEDEB] rounded-[12px] sm:rounded-[26px] aspect-[4/5] relative overflow-hidden">
          {/* Badge */}
          {product.badge && (
            <div
              className={`absolute top-0 left-0 ${badgeColors[product.badge] ?? 'bg-[#4C64F4]'} text-white font-bold text-[11px] tracking-wider uppercase px-4 py-2 rounded-tl-[14px] rounded-br-[8px] z-10`}
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              {product.badge}
            </div>
          )}

          {/* Product Image */}
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.target.src =
                'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80';
            }}
          />
        </div>
      </div>

      {/* Product Name */}
      <h3
        className="mt-4 text-[14px] sm:text-[15px] font-[600] sm:font-[700] leading-tight uppercase tracking-wider text-[#1E1E1E] min-h-[40px] px-1 line-clamp-2"
        style={{ fontFamily: "'Rubik', sans-serif" }}
      >
        {product.name}
      </h3>

      {/* View Product CTA */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleNavigate();
        }}
        className="mt-3 bg-[#232321] hover:bg-black text-white text-[12px] font-normal sm:font-[700] py-3.5 px-4 rounded-[12px] flex items-center justify-center gap-1.5 transition-colors duration-300 uppercase tracking-wider shadow-sm"
        style={{ fontFamily: "'Rubik', sans-serif" }}
      >
        <span>View Product -</span>
        {product.originalPrice ? (
          <span className="flex items-center gap-1">
            <span className="text-[#E9AD43]">${product.price}</span>
            <span className="text-white/40 line-through text-[10px]">
              (${product.originalPrice})
            </span>
          </span>
        ) : (
          <span className="text-[#E9AD43]">${product.price}</span>
        )}
      </button>
    </div>
  );
}
