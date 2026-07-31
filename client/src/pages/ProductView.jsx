import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { addToCart } from "../store/cartSlice";
import { ProductGallery } from "../components/product/ProductGallery";
import { ProductDetails } from "../components/product/ProductDetails";
import { SizeChartModal } from "../components/product/SizeChartModal";
import { RelatedProducts } from "../components/product/RelatedProducts";

const IMAGE_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : '';

function getImageSrc(img) {
  if (!img) return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80";
  if (img.startsWith("http")) return img;
  return `${IMAGE_BASE}${img}`;
}

export default function ProductView() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [relatedList, setRelatedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Product not found");
        return res.json();
      })
      .then((data) => {
        const item = data.data || data;
        const sizeVals = (item.variants && item.variants.length > 0)
          ? [...new Set(item.variants.map((v) => v.size).filter(Boolean))]
          : (item.sizes && item.sizes.length > 0)
          ? item.sizes
          : ["38", "39", "40", "41", "42", "43"];

        const sizes = sizeVals.map((sz) => ({
          value: sz.toString(),
          eu: Number(sz) || 40,
          us: (Number(sz) || 40) - 33,
          uk: (Number(sz) || 40) - 34,
          cm: (Number(sz) || 40) * 0.6,
          inStock: true,
          available: true,
        }));

        const colorList = (item.variants && item.variants.length > 0)
          ? [...new Set(item.variants.map((v) => v.color).filter(Boolean))]
          : (item.colors && item.colors.length > 0)
          ? item.colors
          : ["Black", "White"];

        const rawImages = (item.images && item.images.length > 0)
          ? item.images
          : [item.image || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800"];
        
        const imgList = rawImages.map(getImageSrc);

        const colors = colorList.map((col, idx) => ({
          id: `col-${idx}`,
          name: col,
          hex: col.toLowerCase() === "white" ? "#FFFFFF" : col.toLowerCase() === "red" ? "#EF4444" : col.toLowerCase() === "blue" ? "#3B82F6" : "#1E1E1E",
          images: imgList,
        }));

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
          specs: [
            { label: "Category", value: item.category?.name || item.category || "Footwear" },
            { label: "Gender", value: item.gender || "Unisex" },
            { label: "Material", value: item.material || "Knit Upper" },
            { label: "Status", value: item.status || "In Stock" },
          ],
        };

        setProduct(mapped);
        setSelectedColor(colors[0]);
        setSelectedSize(sizes[0]);

        // Fetch related products dynamically
        fetch(`/api/products/${item.slug || id}/related`)
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

  const handleAddToCart = () => {
    dispatch(
      addToCart({
        variantId: `${product.id}-${selectedSize.value}-${selectedColor.name}`,
        productId: product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        size: selectedSize.value,
        color: selectedColor.name,
        slug: product.slug,
        quantity: 1,
      })
    );
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate("/cart");
  };

  const handleToggleWishlist = () => setIsWishlisted(!isWishlisted);

  return (
    <div className="bg-[#EAE9E5] text-[#232321] selection:bg-[#4A69E2] selection:text-white pb-12 w-full">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6 text-xs text-neutral-500 font-semibold">
          <div className="flex items-center gap-2 flex-wrap">
            <a href="/" className="hover:text-neutral-900 transition-colors">Home</a>
            <span>/</span>
            <a href="/products" className="hover:text-neutral-900 transition-colors">Products</a>
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
              onSelectColor={setSelectedColor}
              onSelectSize={setSelectedSize}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              onToggleWishlist={handleToggleWishlist}
              onOpenSizeChart={() => setSizeChartOpen(true)}
            />
          </div>
        </div>

        {relatedList.length > 0 && (
          <RelatedProducts
            products={relatedList}
            onSelectProduct={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            onQuickAdd={() => { }}
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
