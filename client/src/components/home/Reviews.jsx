import React, { useState, useEffect, useRef } from "react";

/* ------------------------------------------------------------------
   Data
------------------------------------------------------------------ */
const REVIEWS = [
  {
    id: 1,
    title: "Good Quality",
    text: "I highly recommend shopping from kicks",
    rating: 5.0,
    image: "/images/review-1.jpg",
    fallback:
      "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=900&q=80",
    avatar: "https://i.pravatar.cc/120?img=13",
    name: "Alex Bennett",
  },
  {
    id: 2,
    title: "Good Quality",
    text: "I highly recommend shopping from kicks",
    rating: 5.0,
    image: "/images/review-2.jpg",
    fallback:
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=900&q=80",
    avatar: "https://i.pravatar.cc/120?img=33",
    name: "Jane Reyes",
  },
  {
    id: 3,
    title: "Good Quality",
    text: "I highly recommend shopping from kicks",
    rating: 5.0,
    image: "/images/review-3.jpg",
    fallback:
      "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
    avatar: "https://i.pravatar.cc/120?img=68",
    name: "Michael Gough",
  },
];

/* ------------------------------------------------------------------
   Star Icon Component
------------------------------------------------------------------ */
const Star = ({ className = "" }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={`h-[15px] w-[15px] shrink-0 ${className}`}
    fill="currentColor"
  >
    <path d="M12 17.27 6.18 20.4l1.11-6.49L2.5 9.3l6.52-.95L12 2.4l2.98 5.95 6.52.95-4.79 4.61 1.11 6.49z" />
  </svg>
);

const Stars = ({ rating }) => (
  <div className="flex items-center gap-[6px]">
    <div className="flex items-center gap-[3px] text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} />
      ))}
    </div>
    <span className="ml-1 text-[13px] font-semibold text-neutral-500">
      {rating.toFixed(1)}
    </span>
  </div>
);

/* ------------------------------------------------------------------
   Image Component with Graceful Fallback
------------------------------------------------------------------ */
const SafeImg = ({ src, fallback, alt, className }) => {
  const [current, setCurrent] = useState(src);

  return (
    <img
      src={current}
      alt={alt}
      loading="lazy"
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
      className={className}
    />
  );
};

/* ------------------------------------------------------------------
   Review Card Component
------------------------------------------------------------------ */
const ReviewCard = ({ review }) => (
  <article className="group flex h-full flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
    <div className="flex items-start justify-between gap-4 px-[22px] pb-[18px] pt-[19px]">
      <div className="min-w-0">
        <h3 className="text-[17px] font-bold leading-none tracking-[-0.01em] text-neutral-900">
          {review.title}
        </h3>
        <p className="mt-[11px] max-w-[15rem] text-[13.5px] leading-[1.45] text-neutral-600">
          {review.text}
        </p>
        <div className="mt-[13px]">
          <Stars rating={review.rating} />
        </div>
      </div>

      <img
        src={review.avatar}
        alt={review.name}
        className="h-[52px] w-[52px] shrink-0 rounded-full object-cover ring-1 ring-black/5"
      />
    </div>

    <div className="mt-auto aspect-[300/232] w-full overflow-hidden bg-neutral-200">
      <SafeImg
        src={review.image}
        fallback={review.fallback}
        alt={review.title}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
    </div>
  </article>
);

/* ------------------------------------------------------------------
   Main Reviews Section Component
------------------------------------------------------------------ */
export default function Reviews() {
  const [index, setIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /* Auto slide (mobile only) */
  useEffect(() => {
    if (!isMobile || paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % REVIEWS.length);
    }, 3000);
    return () => clearInterval(id);
  }, [isMobile, paused]);

  /* Touch Handlers for Mobile Swipe */
  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
    setPaused(true);
  };

  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 45) {
      setIndex((i) =>
        dx < 0 ? (i + 1) % REVIEWS.length : (i - 1 + REVIEWS.length) % REVIEWS.length
      );
    }
    touchX.current = null;
    setTimeout(() => setPaused(false), 1200);
  };

  return (
    <section className="w-full bg-[#e9e9e4] py-10 sm:py-14">
      <div className="mx-auto w-full max-w-[1080px] px-5 sm:px-8 lg:px-10">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <h2 className="text-[42px] font-black uppercase leading-none tracking-[-0.045em] text-neutral-900 sm:text-[54px] lg:text-[62px]">
            Reviews
          </h2>

          <button
            type="button"
            className="shrink-0 rounded-[6px] bg-[#3f6bec] px-5 py-[13px] text-[12.5px] font-bold uppercase tracking-[0.09em] text-white shadow-sm transition hover:bg-[#3559d0] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#3f6bec]/30 active:scale-[0.98] sm:px-6"
          >
            See all
          </button>
        </header>

        {/* Cards Container */}
        <div className="mt-7 sm:mt-9">
          {/* Desktop / Tablet Grid */}
          <div className="hidden gap-5 md:grid md:grid-cols-3 lg:gap-[22px]">
            {REVIEWS.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>

          {/* Mobile Auto-Slider */}
          <div className="md:hidden">
            <div
              className="overflow-hidden"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <div
                className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: `translateX(-${index * 100}%)` }}
              >
                {REVIEWS.map((r) => (
                  <div key={r.id} className="w-full shrink-0 grow-0 basis-full px-[2px]">
                    <ReviewCard review={r} />
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Dots */}
            <div className="mt-5 flex items-center justify-center gap-2">
              {REVIEWS.map((r, i) => (
                <button
                  key={r.id}
                  aria-label={`Go to review ${i + 1}`}
                  onClick={() => {
                    setIndex(i);
                    setPaused(true);
                    setTimeout(() => setPaused(false), 3000);
                  }}
                  className={
                    "h-[7px] rounded-full transition-all duration-300 " +
                    (i === index
                      ? "w-6 bg-[#3f6bec]"
                      : "w-[7px] bg-neutral-400/50 hover:bg-neutral-500/70")
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}