"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const IMAGE_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : '';

function getImageSrc(img) {
  if (!img) return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80";
  if (img.startsWith("http")) return img;
  return `${IMAGE_BASE}${img}`;
}

export default function SearchOverlay({
  isOpen,
  onClose,
  onSelectTag,
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
      setHits([]);
    }
  }, [isOpen]);

  useEffect(() => {
    // Opening search shows a small discovery set; typing narrows it on the server.
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`${import.meta.env.VITE_API_URL || '/api'}/products?${query.trim() ? `q=${encodeURIComponent(query.trim())}&` : ''}limit=8&sort=popular`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.data)) {
            setHits(data.data);
          } else {
            setHits([]);
          }
        })
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleTagClick = (tag) => {
    setQuery(tag);
    inputRef.current?.focus();
    if (onSelectTag) {
      onSelectTag(tag);
    }
  };

  const handleProductClick = (item) => {
    if (onClose) {
      onClose();
    }
    const slug = item.slug || item.id || item.publicId;
    navigate(`/product/${slug}`);
  };

  const money = (n) => `$${Number(n).toFixed(2)}`;

  return (
    <>
      <div
        id="search-overlay"
        className={`fixed inset-x-0 top-0 z-[70] bg-white shadow-mega ${
          isOpen ? "show" : ""
        }`}
      >
        <div className="mx-auto max-w-[1100px] px-4 sm:px-8 pt-6 pb-8 md:pt-9 md:pb-10">
          <div className="flex items-center gap-3 border-b-2 border-ink pb-3">
            <Search className="w-6 h-6 shrink-0 text-neutral-600" />
            <input
              ref={inputRef}
              id="search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sneakers, brands, styles…"
              className="w-full bg-transparent outline-none text-lg md:text-2xl font-semibold placeholder:text-neutral-400 placeholder:font-medium"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-neutral-400 hover:text-ink text-sm font-bold mr-2"
              >
                Clear
              </button>
            )}
            <button
              id="search-close"
              type="button"
              aria-label="Close search"
              onClick={onClose}
              className="icon-btn shrink-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 mr-1">
              Popular:
            </span>
            {["Running", "Sneakers", "Men", "Women", "Boots"].map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="tag-chip px-4 py-1.5 rounded-full bg-paper text-[13px] font-semibold hover:bg-ink hover:text-white transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
          <div
            id="search-results"
            className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[46vh] overflow-y-auto hide-scroll"
          >
            {loading ? (
              <p className="col-span-full text-center text-neutral-400 font-medium py-10">
                Searching live catalog...
              </p>
            ) : query.trim() && hits.length === 0 ? (
              <p className="col-span-full text-center text-neutral-400 font-medium py-10">
                No results found for “{query}”. Try another term.
              </p>
            ) : hits.map((p) => {
                const imgSrc = getImageSrc(p.image || (p.images && p.images[0]));
                return (
                  <div
                    key={p.id || p.publicId}
                    onClick={() => handleProductClick(p)}
                    className="group cursor-pointer p-2 rounded-2xl hover:bg-paper/80 transition-colors"
                  >
                    <div className="relative rounded-2xl overflow-hidden bg-paper aspect-square">
                      <img
                        src={imgSrc}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-bold uppercase tracking-wider text-ink">
                        {p.gender || "Unisex"}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2 mt-2.5">
                      <div>
                        <p className="text-[13px] font-bold leading-tight">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-neutral-500">{p.category?.name || p.category || ""}</p>
                      </div>
                      <p className="text-[13px] font-semibold text-branddark whitespace-nowrap">
                        {money(p.price)}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      <div
        id="search-backdrop"
        onClick={onClose}
        className={`drawer-backdrop fixed inset-0 z-[65] bg-black/40 ${
          isOpen ? "show" : ""
        }`}
      />
    </>
  );
}
