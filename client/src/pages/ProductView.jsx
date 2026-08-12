import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, removeFromCart, selectCartItems } from "../store/cartSlice";
import { toggleWishlist, selectIsWishlisted, fetchFavourites } from "../store/wishlistSlice";
import { selectVariant, selectProductView } from "../store/productViewSlice";
import { showToast } from "../lib/toast";
import { emitCartVoiceAction } from "../lib/cartVoiceAction";
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

const EU_TO_US = { '35': 5, '36': 6, '37': 6.5, '38': 7.5, '39': 8, '40': 9, '41': 10, '42': 10.5, '43': 11.5, '44': 12, '45': 13, '46': 14 }
const EU_TO_UK = { '35': 3, '36': 4, '37': 4.5, '38': 5.5, '39': 6, '40': 7, '41': 8, '42': 8.5, '43': 9.5, '44': 10, '45': 11, '46': 12 }
const EU_TO_CM = { '35': 22.5, '36': 23, '37': 23.5, '38': 24, '39': 25, '40': 25.5, '41': 26, '42': 26.5, '43': 27.5, '44': 28, '45': 28.5, '46': 29 }

export default function ProductView() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const cartItems = useSelector(selectCartItems);
  const user = useSelector((state) => state.auth.user);
  const { slug: selectionSlug, color: selectionColor, size: selectionSize } = useSelector(selectProductView);

  const [product, setProduct] = useState(null);
  const [relatedList, setRelatedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity] = useState(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);

  const isWishlisted = useSelector(selectIsWishlisted(product?.id));

  // Selected color/size are derived from the Redux store (single source of
  // truth shared with the voice agent via `variant:select`). The rich display
  // objects (hex swatch, gallery images, US/UK sizes) are rebuilt from the
  // product's data here — the store only holds canonical values.
  const selectedColor = useMemo(() => {
    if (!product) return null;
    if (selectionSlug !== product.slug) return product.colors[0] || null;
    return product.colors.find(
      (c) => c.name.toLowerCase() === String(selectionColor || '').toLowerCase()
    ) || product.colors[0] || null;
  }, [product, selectionSlug, selectionColor]);

  const selectedSize = useMemo(() => {
    if (!product) return null;
    const availableForColor = (size) => product.variants.some(
      (v) => v.color === selectedColor?.name && String(v.size) === String(size.value) &&
        Boolean(v.inStock ?? Number(v.available ?? 0) > 0)
    );
    // A voice/URL request wins when its size is in stock for the chosen color
    if (selectionSlug === product.slug && selectionSize != null) {
      const requested = product.sizes.find((s) => String(s.value) === String(selectionSize));
      if (requested && availableForColor(requested)) return requested;
    }
    // Otherwise fall back to the first available size in the selected color
    return product.sizes.find((s) => availableForColor(s)) || null;
  }, [product, selectionSlug, selectionSize, selectedColor]);

  // Favourites are fetched lazily on the product page (not on every app load)
  // so the heart reflects the logged-in user's saved items.
  useEffect(() => {
    if (user?.id) dispatch(fetchFavourites());
  }, [user?.id, dispatch]);

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

        const colorImageEntries = Array.isArray(item.colorImages) ? item.colorImages : [];
        const colorHex = {
          white: '#FFFFFF', black: '#1E1E1E', red: '#EF4444', blue: '#3B82F6',
          navy: '#1E3A8A', green: '#22C55E', yellow: '#EAB308', grey: '#6B7280',
          gray: '#6B7280', pink: '#EC4899', brown: '#92400E', tan: '#D2B48C',
          beige: '#E7DBC8', olive: '#6B7A32',
        };
        const colors = colorList.map((col, idx) => {
          const key = col.toLowerCase();
          const assignedGallery = colorImageEntries.find(
            (entry) => entry.color?.toLowerCase() === key
          );
          // Exact admin-assigned images win. Products created before colour
          // galleries were introduced retain their general gallery as fallback.
          const colorSpecificImgs = assignedGallery?.images?.length
            ? assignedGallery.images.map(getImageSrc)
            : imgList;
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

        // Seed the selection from URL params (?color=red&size=10) — used when
        // the voice agent navigates here mid-command or a deep link is opened.
        // Falls back to the first color / first available size via the
        // derived selectors above when params are absent or invalid.
        const urlColor = searchParams.get('color');
        const urlSize = searchParams.get('size');
        const initialColorName = urlColor
          ? colors.find((c) => c.name.toLowerCase() === urlColor.toLowerCase())?.name ?? null
          : null;
        const initialSizeValue = urlSize
          ? sizeVals.find((v) => String(v) === String(urlSize)) ?? null
          : null;
        dispatch(selectVariant({
          slug: item.slug || id,
          color: initialColorName,
          size: initialSizeValue,
        }));

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
          .catch(() => { });
      })
      .catch((err) => {
        setError(err.message || "Failed to load product");
      })
      .finally(() => setLoading(false));

    window.scrollTo(0, 0);
  }, [id, dispatch, searchParams]);

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
    // Same action the voice agent dispatches — click and voice can never
    // disagree. The size auto-resnap for the new color is handled by the
    // derived `selectedSize` selector (keeps current size if still available).
    dispatch(selectVariant({ slug: product.slug, color: color.name }));
  };

  const handleSizeSelect = (size) => {
    if (!isSizeAvailable(size)) return;
    dispatch(selectVariant({ slug: product.slug, size: String(size.value) }));
  };

  const isSizeAvailable = (size) => product.variants.some((variant) =>
    variant.color === selectedColor?.name && String(variant.size) === String(size.value) && Boolean(variant.inStock ?? Number(variant.available ?? 0) > 0)
  );

  const selectedVariant = product.variants?.find((v) => String(v.size) === String(selectedSize?.value) && v.color === selectedColor?.name);
  const selectedVariantInCart = Boolean(selectedVariant?.id && cartItems.some((item) => item.variantId === selectedVariant.id));
  const handleRemoveFromCart = async () => {
    if (!selectedVariant?.id) return;
    // Emit voice event IMMEDIATELY on click to remove network latency
    emitCartVoiceAction({
      action: 'remove_from_cart',
      productName: product.name,
      color: selectedColor?.name,
      size: selectedSize?.value,
    });
    try {
      await dispatch(removeFromCart(selectedVariant.id)).unwrap();
      showToast(`${product.name} removed from your cart.`, 'cart');
    } catch (requestError) {
      showToast(requestError || 'Unable to remove this item.', 'error', { title: 'Cart update failed' });
    }
  };

  const handleAddToCart = async () => {
    const variant = product.variants?.find(
      (v) => String(v.size) === String(selectedSize?.value) && v.color === selectedColor?.name
    );
    if (!variant?.id || !(variant.inStock ?? Number(variant.available ?? 0) > 0)) {
      showToast('This size is currently unavailable.', 'warning', { title: 'Sold out' });
      return false;
    }

    const alreadyInCart = cartItems.some((i) => i.variantId === variant.id);
    if (alreadyInCart) {
      showToast('This item is already in your cart.', 'cart');
      return false;
    }

    // Emit voice event IMMEDIATELY on click to remove network latency
    emitCartVoiceAction({
      action: 'add_to_cart',
      productName: product.name,
      color: selectedColor?.name,
      size: selectedSize?.value,
    });

    try {
      await dispatch(
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
      ).unwrap();
      showToast(`${product.name} added to your cart.`, 'cart');
      return true;
    } catch (requestError) {
      showToast(requestError || 'Unable to add this item.', 'error', { title: 'Cart update failed' });
      return false;
    }
  };

  const handleBuyNow = async () => {
    const variant = product.variants?.find(
      (v) => String(v.size) === String(selectedSize?.value) && v.color === selectedColor?.name
    );
    const alreadyInCart = variant && cartItems.some((i) => i.variantId === variant.id);
    if (alreadyInCart || await handleAddToCart()) {
      navigate("/cart");
    }
  };

  const handleToggleWishlist = async () => {
    if (!product?.id) return;
    if (!user) {
      showToast('Sign in to save favourites across your devices.', 'profile', { title: 'Account required' });
      navigate(`/login?redirect=${encodeURIComponent(`/product/${product.slug}`)}`);
      return;
    }
    try {
      const result = await dispatch(toggleWishlist(product.id)).unwrap();
      showToast(
        result.saved ? `${product.name} saved to favourites.` : `${product.name} removed from favourites.`,
        'favourite'
      );
    } catch (requestError) {
      showToast(requestError || 'Unable to update favourites.', 'error', { title: 'Favourite update failed' });
    }
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
              key={selectedColor?.id || 'default-gallery'}
              images={selectedColor?.images?.length ? selectedColor.images : [product.image]}
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
              onSelectSize={handleSizeSelect}
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
        onSelectSize={handleSizeSelect}
      />
    </div>
  );
}
