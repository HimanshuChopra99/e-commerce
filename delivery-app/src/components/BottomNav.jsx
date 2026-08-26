import { NavLink, useLocation } from 'react-router-dom'
import Icon from './Icon' // Your app's Icon component

const TABS = [
  { to: '/', label: 'Home', icon: 'home', badge: null },
  { to: '/orders', label: 'Orders', icon: 'local_shipping', badge: '3' },
  { to: '/earnings', label: 'Earnings', icon: 'payments', badge: null },
  { to: '/profile', label: 'Profile', icon: 'person', badge: null },
]

export default function BottomNav() {
  const { pathname } = useLocation()

  // Determine active tab index
  const activeIndex = TABS.findIndex((tab) =>
    tab.to === '/' ? pathname === '/' : pathname.startsWith(tab.to)
  )
  const current = Math.max(0, activeIndex)

  // ===== Dynamic Bezier Curve Path Calculation =====
  const totalTabs = TABS.length // 4 tabs
  const viewBoxWidth = 400
  const viewBoxHeight = 75
  const tabWidth = viewBoxWidth / totalTabs // 100px per tab in SVG space

  // Calculate center X coordinate for the notch dip
  const notchCenterX = current * tabWidth + tabWidth / 2 // 50, 150, 250, 350
  const notchRadius = 40
  const notchDepth = 32

  const leftStart = notchCenterX - notchRadius
  const rightEnd = notchCenterX + notchRadius
  const cp1X = notchCenterX - 20
  const cp2X = notchCenterX + 20

  // Morphing SVG Path data for smooth U-shaped concave notch
  const pathData = `
    M 0,0
    L ${leftStart},0
    C ${leftStart + 12},0 ${cp1X - 6},${notchDepth} ${notchCenterX},${notchDepth}
    C ${cp2X + 6},${notchDepth} ${rightEnd - 12},0 ${rightEnd},0
    L ${viewBoxWidth},0
    L ${viewBoxWidth},${viewBoxHeight}
    L 0,${viewBoxHeight}
    Z
  `

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50   md:hidden select-none pointer-events-none">
      {/* 60fps Spring & Pop Keyframe Animations */}
      <style>{`
        .smooth-svg-curve {
          transition: d 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .spring-bounce {
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes popIcon {
          0% { transform: scale(0.4) translateY(4px); opacity: 0; }
          70% { transform: scale(1.12) translateY(-1px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-pop-icon {
          animation: popIcon 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      {/* Floating Shell Container */}
      <div className="relative max-w-md mx-auto pointer-events-auto">
        <div className="relative w-full h-[72px]">
          
          {/* ===== 1. SVG Morphing Background Bar ===== */}
          <div className="absolute inset-0 drop-shadow-[0_-8px_20px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_-8px_24px_rgba(0,0,0,0.35)]">
            <svg
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              className="w-full h-full"
              preserveAspectRatio="none"
              shapeRendering="geometricPrecision"
            >
              <path
                d={pathData}
                className="smooth-svg-curve fill-white dark:fill-[#1e232a]"
              />
            </svg>
          </div>

          {/* ===== 2. Floating Active Circular Button (FAB) ===== */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex">
            <div
              className="spring-bounce flex items-center justify-center pointer-events-auto"
              style={{
                width: `${100 / totalTabs}%`,
                transform: `translateX(${current * 100}%) translateY(-20px)`,
              }}
            >
              <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-tr from-[#6b38d4] via-[#7c43ea] to-[#9a6bff] text-white shadow-[0_8px_24px_rgba(107,56,212,0.4)] flex items-center justify-center ring-4 ring-white dark:ring-[#1e232a] active:scale-90 transition-transform">
                <Icon
                  key={current}
                  name={TABS[current]?.icon || 'home'}
                  fill
                  className="text-[23px] text-white animate-pop-icon"
                />
              </div>
            </div>
          </div>

          {/* ===== 3. Interactive Tab Buttons ===== */}
          <nav className="absolute inset-0 flex items-center justify-around z-10">
            {TABS.map((tab, idx) => {
              const isActive = current === idx

              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.to === '/'}
                  className="flex-1 h-full flex flex-col items-center justify-end pb-3 pt-1 relative focus:outline-none group active:scale-95 transition-transform"
                >
                  {/* Notification Badge */}
                  {tab.badge && !isActive && (
                    <span className="absolute top-2.5 right-1/4 translate-x-2 text-[10px] font-bold text-white px-1.5 py-0.2 rounded-full bg-[#6b38d4] shadow-xs animate-pulse">
                      {tab.badge}
                    </span>
                  )}

                  {/* Passive Icon & Label */}
                  <div
                    className={`flex flex-col items-center gap-0.5 transition-all duration-300 transform ${
                      isActive
                        ? 'opacity-0 -translate-y-5 pointer-events-none scale-50'
                        : 'opacity-70 group-hover:opacity-100 text-gray-500 dark:text-gray-400 group-hover:text-[#6b38d4] scale-100 translate-y-0'
                    }`}
                  >
                    <Icon name={tab.icon} className="text-[21px]" />
                    <span className="text-[10px] font-bold tracking-tight">
                      {tab.label}
                    </span>
                  </div>

                  {/* Clean Active Text Label (Centered under notch, dot removed) */}
                  {isActive && (
                    <span className="text-[10px] font-extrabold tracking-tight text-[#6b38d4] dark:text-[#a855f7] animate-pop-icon leading-none">
                      {tab.label}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>

        </div>
      </div>
    </div>
  )
}