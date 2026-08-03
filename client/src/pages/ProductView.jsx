import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, removeFromCart, selectCartItems } from "../store/cartSlice";
import { toggleWishlist, selectIsWishlisted } from "../store/wishlistSlice";
import { ProductGallery } from "../components/product/ProductGallery";
import { ProductDetails } from "../components/product/ProductDetails";
import { SizeChartModal } from "../components/product/SizeChartModal";
import { RelatedProducts } from "../components/product/RelatedProducts";

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const IMAGE_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : '';

function getImageSrc(img) {
  if (!img) return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80";
  if (img.startsWith("http")) return img;
  return `${IMAGE_BASE}${img}`;
}

const COLOR_PHOTOS = {
  black: [
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80',
  ],
  white: [
    'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80',
  ],
  red: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?auto=format&fit=crop&w=800&q=80',
  ],
  blue: [
    'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=800&q=80',
  ],
  green: [
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?auto=format&fit=crop&w=800&q=80',
  ],
  grey: [
    'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80',
  ],
  gray: [
    'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80',
  ],
  yellow: [
    'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=800&q=80',
  ],
  pink: [
    'https://images.unsplash.com/photo-1582588678413-dbf45f4823e9?auto=format&fit=crop&w=800&q=80',
  ],
};

const EU_TO_US = { '35': 5, '36': 6, '37': 6.5, '38': 7.5, '39': 8, '40': 9, '41': 10, '42': 10.5, '43': 11.5, '44': 12, '45': 13, '46': 14 }
const EU_TO_UK = { '35': 3, '36': 4, '37': 4.5, '38': 5.5, '39': 6, '40': 7, '41': 8, '42': 8.5, '43': 9.5, '44': 10, '45': 11, '46': 12 }
const EU_TO_CM = { '35': 22.5, '36': 23, '37': 23.5, '38': 24, '39': 25, '40': 25.5, '41': 26, '42': 26.5, '43': 27.5, '44': 28, '45': 28.5, '46': 29 }

export default function ProductView() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const cartItems = useSelector(selectCartItems);

  const [product, setProduct] = useState(null);
  const [relatedList, setRelatedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity] = useState(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);

  const isWishlisted = useSelector(selectIsWishlisted(product?.id));

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then((data) => {
        const item = data.data || data;

        if (item.slug && item.slug !== id) {
          window.history.replaceState(null, '', `/product/${item.slug}`);
        }

        const variants = item.variants || [];
        const sizeVals = [...new Set(variants.map((v) => v.size).filter(Boolean))]
          .sort((a, b) => Number(a) - Number(b));
        const colorList = [...new Set(variants
          .filter((v) => Boolean(v.inStock ?? Number(v.available ?? 0) > 0))
          .map((v) => v.color)
          .filter(Boolean))];

        const toSize = (size, color) => {
          const eu = String(size);
          const variant = variants.find((v) => String(v.size) === eu && v.color === color);
          const available = Boolean(variant?.inStock ?? Number(variant?.available ?? 0) > 0);
          return {
            value: eu,
            eu: Number(eu),
            us: EU_TO_US[eu] ?? Number(eu) - 33,
            uk: EU_TO_UK[eu] ?? Number(eu) - 34,
            cm: EU_TO_CM[eu] ?? Number(eu) * 0.65,
            available,
            inStock: available,
          };
        };

        const rawImages = (item.images && item.images.length > 0)
          ? item.images
          : [item.image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800"];
        
        const imgList = rawImages.map(getImageSrc);

        const colorImageMap = {};
        variants.forEach((v) => {
          if (v.color && !colorImageMap[v.color]) {
            colorImageMap[v.color] = v.image ? [getImageSrc(v.image), ...imgList] : imgList;
          }
        });

        const colorHex = { white: '#FFFFFF', black: '#1E1E1E', red: '#EF4444', blue: '#3B82F6', green: '#22C55E', yellow: '#EAB308', grey: '#6B7280', gray: '#6B7280', pink: '#EC4899', brown: '#92400E', tan: '#D2B48C' };
        const colors = colorList.map((col, idx) => {
          const key = col.toLowerCase();
          const colorSpecificImgs = colorImageMap[col] || COLOR_PHOTOS[key] || [
            imgList[idx % imgList.length],
            ...imgList.filter((_, i) => i !== (idx % imgList.length))
          ];
          return {
            id: `col-${idx}`,
            name: col,
            hex: colorHex[key] || col,
            images: colorSpecificImgs,
          };
        });
        const initialColor = colors[0] || null;
        const sizes = sizeVals.map((size) => toSize(size, initialColor?.name));

        const mapped = {
          id: item.id || item.publicId || id,
          publicId: item.id || item.publicId || id,
          name: item.name,
          slug: item.slug || id,
          price: Number(item.price) || 99.99,
          tag: item.compareAtPrice ? "Sale" : item.featured ? "New" : "Popular",
          sizes,
          colors,
          image: imgList[0],
          description: item.description || "High-performance sneakers engineered for comfort and mobility.",
          rating: item.rating || 4.8,
          variants: item.variants || [],
          specs: [
            { label: "Category", value: item.category?.name || item.category || "Footwear" },
            { label: "Gender", value: item.gender || "Unisex" },
            { label: "Material", value: item.material || "Knit Upper" },
            { label: "Status", value: item.status || "In Stock" },
          ],
        };

        setProduct(mapped);
        setSelectedColor(initialColor);
        setSelectedSize(sizes.find((size) => size.available) || sizes[0] || null);

        // Fetch related products dynamically
        fetch(`${API_BASE}/products/${item.slug || id}/related`)
          .then((r) => r.json())
          .then((relData) => {
            if (relData.data && relData.data.length > 0) {
              const formattedRel = relData.data.map((rp) => ({
                id: rp.id || rp.publicId,
                slug: rp.slug,
                name: rp.name,
                price: Number(rp.price),
                image: getImageSrc(rp.image || (rp.images && rp.images[0])),
                badge: rp.featured ? "New" : "",
                category: rp.category?.name || rp.category || "",
              }));
              setRelatedList(formattedRel);
            }
          })
          .catch(() => {});
      })
      .catch((err) => {
        setError(err.message || "Failed to load product");
      })
      .finally(() => setLoading(false));

    window.scrollTo(0, 0);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EAE9E5] flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1E1E1E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-600">Loading Product Details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#EAE9E5] flex items-center justify-center py-20">
        <div className="text-center bg-white p-8 rounded-3xl shadow-sm max-w-md">
          <span className="text-5xl mb-4 block">👟</span>
          <h2 className="text-xl font-bold mb-2 text-gray-900">Product Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">{error || "The requested product does not exist in the database."}</p>
          <button
            onClick={() => navigate("/products")}
            className="bg-[#1E1E1E] text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors"
          >
            Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  const handleColorSelect = (color) => {
    setSelectedColor(color);
    const matchingSize = product.sizes.find((size) => product.variants.some(
      (variant) => variant.color === color.name && String(variant.size) === String(size.value) && Boolean(variant.inStock ?? Number(variant.available ?? 0) > 0)
    ));
    if (matchingSize) setSelectedSize({ ...matchingSize, available: true, inStock: true });
  };

  const isSizeAvailable = (size) => product.variants.some((variant) =>
    variant.color === selectedColor?.name && String(variant.size) === String(size.value) && Boolean(variant.inStock ?? Number(variant.available ?? 0) > 0)
  );

  const selectedVariant = product.variants?.find((v) => String(v.size) === String(selectedSize?.value) && v.color === selectedColor?.name);
  const selectedVariantInCart = Boolean(selectedVariant?.id && cartItems.some((item) => item.variantId === selectedVariant.id));
  const handleRemoveFromCart = () => {
    if (!selectedVariant?.id) return;
    dispatch(removeFromCart(selectedVariant.id));
    window.dispatchEvent(new CustomEvent('kick:toast', { detail: `${product.name} removed from your cart.` }));
  };

  const handleAddToCart = () => {
    const variant = product.variants?.find(
      (v) => String(v.size) === String(selectedSize?.value) && v.color === selectedColor?.name
    );
    if (!variant?.id || !Boolean(variant.inStock ?? Number(variant.available ?? 0) > 0)) {
      window.dispatchEvent(new CustomEvent('kick:toast', { detail: 'This size is currently unavailable.' }));
      return false;
    }

    const alreadyInCart = cartItems.some((i) => i.variantId === variant.id);
    if (alreadyInCart) {
      window.dispatchEvent(new CustomEvent('kick:toast', { detail: 'Already available in cart.' }));
      return false;
    }

    dispatch(
      addToCart({
        variantId: variant.id,
        productId: product.id,
        name: product.name,
        image: selectedColor?.images?.[0] || product.image,
        price: product.price,
        size: selectedSize.value,
        color: selectedColor.name,
        slug: product.slug,
        quantity: 1,
      })
    );
    window.dispatchEvent(new CustomEvent('kick:toast', { detail: `${product.name} added to your cart.` }));
    return true;
  };

  const handleBuyNow = () => {
    const variant = product.variants?.find(
      (v) => String(v.size) === String(selectedSize?.value) && v.color === selectedColor?.name
    );
    const alreadyInCart = variant && cartItems.some((i) => i.variantId === variant.id);
    if (alreadyInCart || handleAddToCart()) {
      navigate("/cart");
    }
  };

  const handleToggleWishlist = () => {
    if (!product?.id) return;
    dispatch(toggleWishlist(product.id));
    window.dispatchEvent(
      new CustomEvent('kick:toast', {
        detail: isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist ❤️',
      })
    );
  };

  return (
    <div className="bg-[#EAE9E5] text-[#232321] selection:bg-[#4A69E2] selection:text-white pb-12 w-full">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6 text-xs text-neutral-500 font-semibold">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/" className="hover:text-neutral-900 transition-colors">Home</Link>
            <span>/</span>
            <Link to="/products" className="hover:text-neutral-900 transition-colors">Products</Link>
            <span>/</span>
            <span className="text-neutral-900 font-bold">{product.name}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          <div className="lg:col-span-7">
            <ProductGallery
              images={selectedColor ? selectedColor.images : [product.image]}
              productName={product.name}
            />
          </div>

          <div className="lg:col-span-5 bg-transparent rounded-3xl">
            <ProductDetails
              product={product}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              quantity={quantity}
              isWishlisted={isWishlisted}
              onSelectColor={handleColorSelect}
              onSelectSize={(size) => isSizeAvailable(size) && setSelectedSize({ ...size, available: true, inStock: true })}
              isSizeAvailable={isSizeAvailable}
              onAddToCart={handleAddToCart}
              isInCart={selectedVariantInCart}
              onRemoveFromCart={handleRemoveFromCart}
              onBuyNow={handleBuyNow}
              onToggleWishlist={handleToggleWishlist}
              onOpenSizeChart={() => setSizeChartOpen(true)}
            />
          </div>
        </div>

        {relatedList.length > 0 && (
          <RelatedProducts
            products={relatedList}
            onSelectProduct={(item) => {
              navigate(`/product/${item.slug || item.id}`);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onQuickAdd={(item) => {
              navigate(`/product/${item.slug || item.id}`);
            }}
            onViewAll={() => navigate('/products')}
          />
        )}
      </main>

      <SizeChartModal
        isOpen={sizeChartOpen}
        onClose={() => setSizeChartOpen(false)}
        sizes={product.sizes}
        currentSize={selectedSize}
        onSelectSize={setSelectedSize}
      />
    </div>
  );
}
