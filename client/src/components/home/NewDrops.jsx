import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchFeaturedProducts } from '../../store/productsSlice';

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
    <div className="flex flex-col group animate-pulse">
      <div className="bg-white p-1.5 rounded-[16px] sm:rounded-[32px] shadow-sm">
        <div className="bg-gray-200 rounded-[12px] sm:rounded-[26px] aspect-[4/5]" />
      </div>
      <div className="mt-4 h-4 bg-gray-200 rounded w-3/4 mx-1" />
      <div className="mt-3 h-10 bg-gray-200 rounded-[12px]" />
    </div>
  );
}

export default function NewDrops() {
  const dispatch = useDispatch();
  const { featured: products, loading } = useSelector((state) => state.products);

  useEffect(() => {
    dispatch(fetchFeaturedProducts());
  }, [dispatch]);

  const displayProducts = products.slice(0, 4);

  return (
    <section
      className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 bg-[#EAE9E4] text-[#1E1E1E]"
      id="new-drops"
      style={{ fontFamily: "'Rubik', sans-serif" }}
    >
      <div className="max-w-[1280px] mx-auto w-full">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 md:mb-14">
          <div>
            <h2
              className="text-[44px] sm:text-[60px] md:text-[72px] font-bold sm:font-[800] leading-[0.9] tracking-tight uppercase"
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              Don't Miss Out<br />
              <span className="text-[#1E1E1E]">New Drops</span>
            </h2>
          </div>
          <div>
            <Link
              to="/products"
              className="bg-[#4C64F4] hover:bg-[#3B53E3] text-white text-[13px] font-medium sm:font-[700] tracking-wider uppercase px-6 py-4 rounded-[12px] shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              Shop New Drops
            </Link>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
            : displayProducts.length > 0
            ? displayProducts.map((product) => {
                const imgSrc = getImageSrc(
                  product.image || (product.images && product.images[0])
                );
                const slug = product.slug || product.id || product.publicId;
                return (
                  <Link
                    key={product.id || product.publicId}
                    to={`/product/${slug}`}
                    className="flex flex-col group cursor-pointer"
                  >
                    <div className="bg-white p-1.5 rounded-[16px] sm:rounded-[32px] shadow-sm transition-all duration-300 group-hover:shadow-md relative overflow-hidden">
                      <div className="bg-[#EDEDEB] rounded-[12px] sm:rounded-[26px] aspect-[4/5] flex items-center justify-center p-6 relative overflow-hidden">
                        <img
                          src={imgSrc}
                          alt={product.name}
                          className="w-[100%] h-auto object-contain transform transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3"
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80';
                          }}
                        />
                        <div className="absolute top-0 left-0 bg-[#4C64F4] text-white font-bold text-[11px] tracking-wider uppercase px-4 py-2 rounded-tl-[14px] rounded-br-[8px]">
                          New
                        </div>
                      </div>
                    </div>

                    <h3
                      className="mt-4 text-[14px] sm:text-[15px] font-[600] sm:font-[700] leading-tight uppercase tracking-wider text-[#1E1E1E] min-h-[40px] px-1 line-clamp-2"
                      style={{ fontFamily: "'Rubik', sans-serif" }}
                    >
                      {product.name}
                    </h3>

                    <div
                      className="mt-3 bg-[#232321] group-hover:bg-black text-white text-[12px] font-normal sm:font-[700] py-3.5 px-4 rounded-[12px] flex items-center justify-center gap-1.5 transition-colors duration-300 uppercase tracking-wider shadow-sm"
                      style={{ fontFamily: "'Rubik', sans-serif" }}
                    >
                      <span>View Product - </span>
                      <span className="text-[#E9AD43]">${Number(product.price).toFixed(2)}</span>
                    </div>
                  </Link>
                );
              })
            : Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col group">
                  <div className="bg-white p-1.5 rounded-[16px] sm:rounded-[32px] shadow-sm">
                    <div className="bg-[#EDEDEB] rounded-[12px] sm:rounded-[26px] aspect-[4/5] flex items-center justify-center">
                      <span className="text-4xl">👟</span>
                    </div>
                  </div>
                  <h3 className="mt-4 text-[14px] font-[700] uppercase text-[#1E1E1E]">
                    Coming Soon
                  </h3>
                  <Link
                    to="/products"
                    className="mt-3 bg-[#232321] hover:bg-black text-white text-[12px] font-[700] py-3.5 px-4 rounded-[12px] flex items-center justify-center gap-1.5 uppercase tracking-wider"
                  >
                    Browse All
                  </Link>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
