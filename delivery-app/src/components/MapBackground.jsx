// Minimalist light-mode map illustration built as inline SVG.
// Reproduces the aesthetic of the design mockups (pale gray/soft-green land,
// thin white roads, purple route line) and works fully offline.
export default function MapBackground({ showRoute = true }) {
  return (
    <svg
      className="w-full h-full"
      viewBox="0 0 400 600"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Base land */}
      <rect width="400" height="600" fill="#eef1ef" />
      {/* Park blocks */}
      <rect x="20" y="30" width="80" height="70" rx="8" fill="#dce8d8" />
      <rect x="300" y="420" width="80" height="90" rx="8" fill="#dce8d8" />
      <rect x="40" y="430" width="70" height="60" rx="8" fill="#dde6e3" />
      {/* Water body */}
      <path
        d="M250 40 Q280 90 250 150 Q230 200 260 250 L340 250 Q360 180 330 120 Q310 70 250 40 Z"
        fill="#dbe9f2"
      />

      {/* Road network (thin white roads with subtle stroke) */}
      <g stroke="#ffffff" strokeWidth="7" strokeLinecap="round" fill="none">
        <path d="M0 200 H400" />
        <path d="M0 420 H400" />
        <path d="M120 0 V600" />
        <path d="M280 0 V600" />
        <path d="M0 90 H120" />
        <path d="M280 90 H400" />
        <path d="M0 520 H120" />
        <path d="M280 520 H400" />
      </g>

      {/* Route line (purple) */}
      {showRoute && (
        <g
          stroke="#6b38d4"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.85"
        >
          <path d="M64 195 H120 V120 H280 V300 H64 V600" />
        </g>
      )}

      {/* Small road detail dots */}
      <g fill="#ffffff">
        <circle cx="200" cy="180" r="3" />
        <circle cx="200" cy="300" r="3" />
        <circle cx="160" cy="420" r="3" />
        <circle cx="320" cy="420" r="3" />
      </g>
    </svg>
  );
}
