import { useState } from "react";
import { Maximize2, X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
export const ProductGallery = ({ images, productName }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);
  const openLightbox = (index) => {
    setSelectedImageIndex(index);
  };
  const closeLightbox = () => {
    setSelectedImageIndex(null);
  };
  const nextImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex + 1) % images.length);
    }
  };
  const prevImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex - 1 + images.length) % images.length);
    }
  };
  return <div className="w-full">
    {
      /* Desktop & Tablet: 2x2 Grid (matching exact reference image) */
    }
    <div className="hidden md:grid grid-cols-2 gap-3 sm:gap-4">
      {images.map((img, index) => <div
        key={index}
        onClick={() => openLightbox(index)}
        className="group relative bg-[#EAEAE8] rounded-2xl sm:rounded-3xl overflow-hidden aspect-square cursor-zoom-in border border-neutral-200/50 shadow-xs hover:shadow-md transition-all duration-300"
      >
        <img
          src={img}
          alt={`${productName} view ${index + 1}`}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
         loading="lazy" decoding="async"/>

        {
          /* Quick Zoom Overlay */
        }
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-white/90 backdrop-blur-md p-3 rounded-full text-neutral-800 shadow-md transform scale-90 group-hover:scale-100 transition-transform">
            <ZoomIn className="w-5 h-5" />
          </span>
        </div>

        {
          /* Subtle View Index Badge */
        }
        <span className="absolute bottom-3 right-3 text-[10px] font-bold tracking-widest text-neutral-500 bg-white/70 backdrop-blur-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
          0{index + 1} / 0{images.length}
        </span>
      </div>)}
    </div>

    {
      /* Mobile: Swipeable Main Image + Thumbnail Bar */
    }
    <div className="md:hidden relative">
      <div className="relative bg-[#EAEAE8] rounded-2xl overflow-hidden aspect-square border border-neutral-200/50">
        <img
          src={images[activeMobileIndex]}
          alt={`${productName} mobile view`}
          className="w-full h-full object-cover object-center transition-all duration-300"
          onClick={() => openLightbox(activeMobileIndex)}
          loading="lazy"
          decoding="async"
        />

        <button
          onClick={() => setActiveMobileIndex((prev) => prev === 0 ? images.length - 1 : prev - 1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-md p-2 rounded-full text-neutral-800 shadow-sm"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveMobileIndex((prev) => prev === images.length - 1 ? 0 : prev + 1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-md p-2 rounded-full text-neutral-800 shadow-sm"
          aria-label="Next image"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {
          /* Expand Fullscreen Button */
        }
        <button
          onClick={() => openLightbox(activeMobileIndex)}
          className="absolute top-3 right-3 bg-white/80 backdrop-blur-md p-2 rounded-full text-neutral-800 shadow-sm"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {
        /* Thumbnail Selector Dots / Bar */
      }
      <div className="flex justify-center gap-2 mt-3">
        {images.map((img, idx) => <button
          key={idx}
          onClick={() => setActiveMobileIndex(idx)}
          className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${activeMobileIndex === idx ? "border-blue-600 scale-105 shadow-sm" : "border-transparent opacity-60"}`}
        >
          <img src={img} alt="thumb" className="w-full h-full object-cover"  loading="lazy" decoding="async"/>
        </button>)}
      </div>
    </div>

    {
      /* Lightbox / Fullscreen Modal */
    }
    {selectedImageIndex !== null && <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-8 animate-in fade-in duration-200">
      {
        /* Top Bar */
      }
      <div className="w-full flex items-center justify-between text-white max-w-6xl">
        <span className="font-brand font-bold tracking-wide text-sm sm:text-base">
          {productName} — Photo {selectedImageIndex + 1} of {images.length}
        </span>
        <button
          onClick={closeLightbox}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          aria-label="Close lightbox"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {
        /* Main Zoom View */
      }
      <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-4 overflow-hidden">
        <img
          src={images[selectedImageIndex]}
          alt="Zoomed view"
          className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all"
         loading="lazy" decoding="async"/>

        <button
          onClick={prevImage}
          className="absolute left-2 sm:left-6 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>

        <button
          onClick={nextImage}
          className="absolute right-2 sm:right-6 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors cursor-pointer"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      </div>

      {
        /* Thumbnail Bar */
      }
      <div className="flex gap-2 sm:gap-3 overflow-x-auto p-2 bg-white/10 rounded-2xl backdrop-blur-md max-w-md">
        {images.map((img, idx) => <button
          key={idx}
          onClick={() => setSelectedImageIndex(idx)}
          className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${selectedImageIndex === idx ? "border-white scale-105" : "border-transparent opacity-50 hover:opacity-80"}`}
        >
          <img src={img} alt="thumb" className="w-full h-full object-cover"  loading="lazy" decoding="async"/>
        </button>)}
      </div>
    </div>}
  </div>;
};
