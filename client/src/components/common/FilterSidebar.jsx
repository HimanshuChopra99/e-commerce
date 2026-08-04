import { useState } from "react";
import { ChevronUp, ChevronDown, SlidersHorizontal, X } from "lucide-react";
const REFINE_OPTIONS = [];

function Section({
  title,
  children,
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-gray-100 pb-4 mb-4">
      <button
        className="flex items-center justify-between w-full mb-3"
        onClick={() => setOpen(!open)}
      >
        <span
          className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1E1E1E]"
          style={{ fontFamily: "'Rubik', sans-serif" }}
        >
          {title}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && children}
    </div>
  );
}

export default function FilterSidebar({ filters, onChange, availableFilters = {}, categories = [] }) {
  const sizes = availableFilters.sizes || [];
  const colors = availableFilters.colors || [];
  const genders = availableFilters.genders || [];
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggle(arr = [], val) {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  const content = (
    <div className="space-y-0">
      {/* Refine By */}
      <Section title="Refine By">
        <div className="flex flex-wrap gap-2">
          {REFINE_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() =>
                onChange({ ...filters, refineBy: toggle(filters.refineBy, opt) })
              }
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all duration-200 ${
                (filters.refineBy || []).includes(opt)
                  ? "bg-[#4C64F4] text-white border-[#4C64F4]"
                  : "bg-white text-[#1E1E1E] border-gray-200 hover:border-[#4C64F4]"
              }`}
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              {opt}
            </button>
          ))}
        </div>
      </Section>

      {/* Size */}
      <Section title="Size">
        <div className="grid grid-cols-5 gap-1.5">
          {sizes.map((size) => (
            <button
              key={size}
              onClick={() =>
                onChange({
                  ...filters,
                  sizes: (filters.sizes || [])[0] === String(size) ? [] : [String(size)],
                })
              }
              aria-pressed={(filters.sizes || [])[0] === String(size)}
              className={`py-1.5 rounded-[8px] text-[12px] font-semibold border transition-all duration-200 ${
                (filters.sizes || []).includes(size)
                  ? "bg-[#1E1E1E] text-white border-[#1E1E1E]"
                  : "bg-white text-[#1E1E1E] border-gray-200 hover:border-[#1E1E1E]"
              }`}
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              {size}
            </button>
          ))}
        </div>
      </Section>

      {/* Color */}
      <Section title="Color">
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <button
              key={color}
              title={color}
              onClick={() =>
                onChange({
                  ...filters,
                  colors: (filters.colors || [])[0] === color ? [] : [color],
                })
              }
              aria-pressed={(filters.colors || [])[0] === color}
              className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                (filters.colors || []).includes(color)
                  ? "border-[#4C64F4] scale-110 shadow-md"
                  : "border-white shadow-sm hover:border-gray-300"
              }`}
              style={{ backgroundColor: ({ White: '#fff', Black: '#1E1E1E', Red: '#EF4444', Blue: '#3B82F6', Green: '#22C55E', Yellow: '#EAB308', Grey: '#6B7280', Gray: '#6B7280', Pink: '#EC4899', Brown: '#92400E', Tan: '#D2B48C' }[color] || '#1E1E1E') }}
            />
          ))}
        </div>
      </Section>

      {/* Category */}
      <Section title="Category">
        <div className="space-y-2">
          {categories.map((cat) => (
            <label key={cat.slug} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={(filters.categories || []).includes(cat.slug)}
                onChange={() =>
                  onChange({
                    ...filters,
                    categories: toggle(filters.categories, cat.slug),
                  })
                }
                className="w-4 h-4 accent-[#4C64F4] rounded"
              />
              <span
                className="text-[13px] text-[#555] group-hover:text-[#1E1E1E] transition-colors"
                style={{ fontFamily: "'Rubik', sans-serif" }}
              >
                {cat.name}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* Gender */}
      <Section title="Gender">
        <div className="space-y-2">
          {genders.map((g) => (
            <label key={g} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={(filters.gender || []).includes(g)}
                onChange={() =>
                  onChange({ ...filters, gender: toggle(filters.gender, g) })
                }
                className="w-4 h-4 accent-[#4C64F4] rounded"
              />
              <span
                className="text-[13px] text-[#555] group-hover:text-[#1E1E1E] transition-colors"
                style={{ fontFamily: "'Rubik', sans-serif" }}
              >
                {g}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* Price Range */}
      <Section title="Price">
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={1000}
            value={filters.priceRange || 1000}
            onChange={(e) =>
              onChange({ ...filters, priceRange: Number(e.target.value) })
            }
            className="w-full accent-[#4C64F4] h-1.5 rounded-full cursor-pointer"
          />
          <div className="flex justify-between text-[12px] text-[#888]" style={{ fontFamily: "'Rubik', sans-serif" }}>
            <span>$0</span>
            <span>${filters.priceRange || 1000}</span>
            <span>$1000</span>
          </div>
        </div>
      </Section>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[220px] flex-shrink-0">
        <h2
          className="text-[18px] font-bold text-[#1E1E1E] mb-5"
          style={{ fontFamily: "'Rubik', sans-serif" }}
        >
          Filters
        </h2>
        {content}
      </aside>

      {/* Mobile Filter Button */}
      <div className="lg:hidden w-full mb-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 bg-white border border-gray-200 rounded-[10px] px-4 py-2.5 text-[13px] font-semibold text-[#1E1E1E] shadow-sm hover:shadow-md transition-all"
          style={{ fontFamily: "'Rubik', sans-serif" }}
        >
          <SlidersHorizontal size={15} />
          Filters
        </button>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="relative z-10 bg-white w-[300px] max-w-[90vw] h-full overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-[18px] font-bold text-[#1E1E1E]"
                style={{ fontFamily: "'Rubik', sans-serif" }}
              >
                Filters
              </h2>
              <button onClick={() => setMobileOpen(false)}>
                <X size={20} />
              </button>
            </div>
            {content}
            <button
              onClick={() => setMobileOpen(false)}
              className="mt-4 w-full bg-[#232321] text-white py-3 rounded-[12px] text-[13px] font-bold uppercase tracking-wider"
              style={{ fontFamily: "'Rubik', sans-serif" }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </>
  );
}
